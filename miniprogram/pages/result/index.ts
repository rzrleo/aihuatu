// index.ts
// 云函数返回结果接口
interface CloudFunctionResult {
  openid?: string;
  [key: string]: any;
}

// 数据库操作结果接口
interface DbOperationResult {
  _id?: string;
  errMsg?: string;
}

// AI任务查询结果接口
interface AiTaskQueryResult {
  success: boolean;
  data?: {
    output: {
      task_id: string;
      task_status: string;
      results?: Array<{
        url: string;
        orig_prompt: string;
        actual_prompt?: string;
      }>;
    };
    request_id: string;
    usage?: {
      image_count: number;
    };
  };
  error?: any;
}

// 图片发布结果接口
interface PublishImageResult {
  success: boolean;
  data?: {
    fileID: string;
    imageId: string;
  };
  error?: any;
}

Page({
  data: {
    prompt: '',
    negativePrompt: '',
    imageUrl: '',
    imageId: '',
    taskId: '',
    loading: false,
    publishing: false,
    generationFailed: false,
    isPolling: false,
    retryCount: 0,
    maxRetries: 20, // 最大轮询次数
    envId: 'aihuatu-5gl6dhqt6d05ca01'
  },

  onLoad(options: any) {
    // 确保云环境已初始化
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: this.data.envId,
        traceUser: true,
      });
    }

    if (options) {
      this.setData({
        prompt: options.prompt ? decodeURIComponent(options.prompt) : '',
        negativePrompt: options.negativePrompt ? decodeURIComponent(options.negativePrompt) : '',
        imageUrl: options.imageUrl ? decodeURIComponent(options.imageUrl) : '',
        imageId: options.imageId || '',
        taskId: options.taskId || ''
      });
      
      // 如果有taskId，则查询任务结果
      if (options.taskId) {
        this.pollTaskResult();
      }
      // 如果没有传入图片URL，但传入了imageId，则从数据库获取图片信息
      else if (!options.imageUrl && options.imageId) {
        this.loadImageById(options.imageId);
      }
      // 如果没有任何参数传入，则生成随机图片作为示例
      else if (!options.imageUrl && !options.imageId && !options.taskId) {
        this.generateImage();
      }
    }
  },

  // 返回上一页
  onBack() {
    // 停止所有轮询
    this.setData({
      isPolling: false
    });
    wx.navigateBack();
  },

  // 轮询查询任务结果
  async pollTaskResult() {
    if (!this.data.taskId || this.data.retryCount >= this.data.maxRetries || !this.data.isPolling) {
      return;
    }
    
    this.setData({
      loading: true,
      isPolling: true,
      retryCount: this.data.retryCount + 1
    });
    
    try {
      const queryResult = await wx.cloud.callFunction({
        name: 'aiGenerate',
        data: {
          action: 'queryTask',
          params: {
            taskId: this.data.taskId
          }
        }
      });
      
      const aiResult = queryResult.result as AiTaskQueryResult;
      
      if (!aiResult.success) {
        throw new Error('查询AI绘图任务失败: ' + (aiResult.error ? JSON.stringify(aiResult.error) : '未知错误'));
      }
      
      const taskStatus = aiResult.data?.output?.task_status;
      console.log('AI绘图任务状态:', taskStatus, '第', this.data.retryCount, '次轮询');
      
      // 任务完成
      if (taskStatus === 'SUCCEEDED') {
        const results = aiResult.data?.output?.results;
        if (results && results.length > 0 && results[0].url) {
          // 获取到图片URL，保存到数据库
          await this.saveTaskResultToDb(results[0].url);
          
          this.setData({
            imageUrl: results[0].url,
            loading: false,
            isPolling: false
          });
        } else {
          throw new Error('获取图片URL失败');
        }
      } 
      // 任务失败
      else if (taskStatus === 'FAILED') {
        throw new Error('AI绘图任务失败');
      }
      // 任务仍在进行中，继续轮询
      else {
        setTimeout(() => {
          this.pollTaskResult();
        }, 3000); // 每3秒轮询一次
      }
    } catch (error) {
      console.error('查询任务结果失败:', error);
      this.setData({
        loading: false,
        isPolling: false,
        generationFailed: true
      });
      
      wx.showToast({
        title: '生成图片失败，请重试',
        icon: 'none'
      });
    }
  },

  // 保存任务结果到数据库
  async saveTaskResultToDb(imageUrl: string) {
    if (!imageUrl) return;
    
    try {
      const db = wx.cloud.database();
      const dbResult = await db.collection('images').add({
        data: {
          prompt: this.data.prompt,
          negativePrompt: this.data.negativePrompt,
          fileID: imageUrl,
          createTime: db.serverDate(),
          status: 'completed',
          taskId: this.data.taskId,
          published: false // 默认未发布
        }
      });
      
      const addResult = dbResult as DbOperationResult;
      if (addResult && addResult._id) {
        this.setData({
          imageId: addResult._id
        });
        console.log('AI生成图片保存成功, id:', addResult._id);
      } else {
        console.error('保存图片记录失败');
      }
    } catch (error) {
      console.error('保存图片失败:', error);
    }
  },

  // 根据ID加载图片信息
  async loadImageById(imageId: string) {
    this.setData({
      loading: true
    });

    try {
      const db = wx.cloud.database();
      const result = await db.collection('images').doc(imageId).get();
      
      if (result && result.data) {
        this.setData({
          prompt: result.data.prompt || '',
          negativePrompt: result.data.negativePrompt || '',
          imageUrl: result.data.fileID || '',
          taskId: result.data.taskId || '',
          loading: false
        });
      } else {
        throw new Error('找不到图片');
      }
    } catch (error) {
      console.error('加载图片失败:', error);
      this.setData({
        loading: false
      });
      
      wx.showToast({
        title: '加载图片失败',
        icon: 'none'
      });
      
      // 失败时生成一个随机图片
      this.generateImage();
    }
  },

  // 生成随机图片（Demo用）
  generateImage() {
    this.setData({
      loading: true
    });

    // 模拟AI生成过程，使用随机图片作为示例
    setTimeout(() => {
      const randomSeed = Math.floor(Math.random() * 1000);
      this.setData({
        imageUrl: `https://picsum.photos/800/800?random=${randomSeed}`,
        loading: false
      });
    }, 2000);
  },

  // 重新生成图片
  onRetryClick() {
    // 跳转回创建页面，带上当前的提示词
    wx.navigateTo({
      url: `/pages/create/index?prompt=${encodeURIComponent(this.data.prompt)}&negativePrompt=${encodeURIComponent(this.data.negativePrompt)}`
    });
  },

  onShow() {
    // 如果有任务ID并且没有图片URL，自动开始轮询
    if (this.data.taskId && !this.data.imageUrl && !this.data.isPolling) {
      this.setData({
        retryCount: 0,
        isPolling: true
      });
      this.pollTaskResult();
    }
  },

  onHide() {
    // 离开页面时停止轮询
    this.setData({
      isPolling: false
    });
  },

  onUnload() {
    // 页面卸载时停止轮询
    this.setData({
      isPolling: false
    });
  },

  // 保存图片到数据库（未使用任务ID的备用方法）
  async saveImageToDb() {
    try {
      const db = wx.cloud.database();
      const dbResult = await db.collection('images').add({
        data: {
          prompt: this.data.prompt,
          negativePrompt: this.data.negativePrompt,
          fileID: this.data.imageUrl,
          createTime: db.serverDate(),
          status: 'completed'
        }
      });
      
      const addResult = dbResult as DbOperationResult;
      if (addResult && addResult._id) {
        this.setData({
          imageId: addResult._id
        });
        console.log('图片保存成功, id:', addResult._id);
      } else {
        throw new Error('保存图片记录失败');
      }
    } catch (error) {
      console.error('保存图片失败:', error);
      throw error;
    }
  },

  // 发布图片
  async onPublishClick() {
    if (!this.data.imageUrl) {
      wx.showToast({
        title: '图片还未生成',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ publishing: true });
    
    wx.showLoading({
      title: '正在发布...',
      mask: true
    });
    
    try {
      console.log('准备发布图片，图片URL:', this.data.imageUrl);
      
      // 如果是本地临时文件路径，先上传到云存储
      let imageUrl = this.data.imageUrl;
      if (imageUrl.startsWith('wxfile://') || imageUrl.startsWith('http://tmp/') || imageUrl.startsWith('https://tmp/')) {
        try {
          // 直接上传本地图片到云存储
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: `images/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`,
            filePath: imageUrl
          });
          
          if (uploadResult && uploadResult.fileID) {
            imageUrl = uploadResult.fileID;
            console.log('成功上传本地图片到云存储:', imageUrl);
          }
        } catch (uploadError) {
          console.error('上传本地图片失败:', uploadError);
        }
      }
      
      // 调用云函数发布图片
      const publishResult = await wx.cloud.callFunction({
        name: 'aiGenerate',
        data: {
          action: 'publishImage',
          params: {
            imageUrl: imageUrl,
            prompt: this.data.prompt,
            negativePrompt: this.data.negativePrompt || '',
            taskId: this.data.taskId || ''
          }
        }
      });
      
      console.log('发布图片云函数返回结果:', publishResult);
      const result = publishResult.result as PublishImageResult;
      
      if (!result || !result.success) {
        const errorMsg = result?.error ? JSON.stringify(result.error) : '未知错误';
        throw new Error('发布图片失败: ' + errorMsg);
      }
      
      console.log('图片发布成功:', result.data);
      
      wx.hideLoading();
      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 2000
      });
      
      setTimeout(() => {
        this.setData({ publishing: false });
        // 发布成功后跳转到首页
        wx.switchTab({
          url: '/pages/home/index'
        });
      }, 1500);
      
    } catch (error) {
      console.error('发布图片失败:', error);
      wx.hideLoading();
      
      this.setData({ publishing: false });
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'none',
        duration: 2000
      });
    }
  }
}); 
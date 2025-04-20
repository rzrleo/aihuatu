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

Page({
  data: {
    prompt: '',
    negativePrompt: '',
    imageUrl: '',
    imageId: '',
    loading: false,
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
        imageId: options.imageId || ''
      });
      
      // 如果没有传入图片URL，但传入了imageId，则从数据库获取图片信息
      if (!options.imageUrl && options.imageId) {
        this.loadImageById(options.imageId);
      }
      // 如果没有任何参数传入，则生成随机图片作为示例
      else if (!options.imageUrl && !options.imageId) {
        this.generateImage();
      }
    }
  },

  // 返回上一页
  onBack() {
    wx.navigateBack();
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

  // 发布图片
  async onPublishClick() {
    // 如果没有imageId，说明是示例图片，需要先保存到数据库
    if (!this.data.imageId && this.data.imageUrl) {
      await this.saveImageToDb();
    }

    wx.showLoading({
      title: '正在发布...',
      mask: true
    });

    try {
      // 获取用户OpenID
      const loginRes = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      });
      
      const cloudResult = loginRes.result as CloudFunctionResult;
      if (!cloudResult || !cloudResult.openid) {
        throw new Error('获取用户OpenID失败');
      }
      
      // 更新图片状态为已发布
      const db = wx.cloud.database();
      if (this.data.imageId) {
        await db.collection('images').doc(this.data.imageId).update({
          data: {
            published: true,
            publishTime: db.serverDate()
          }
        });
      }

      wx.hideLoading();
      
      wx.showToast({
        title: '发布成功',
        icon: 'success',
        duration: 2000
      });
      
      // 跳转回首页
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/home/index'
        });
      }, 1500);
    } catch (error) {
      console.error('发布失败:', error);
      wx.hideLoading();
      
      wx.showToast({
        title: '发布失败，请重试',
        icon: 'none'
      });
    }
  },

  // 保存图片到数据库
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
  }
}); 
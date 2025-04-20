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

// AI任务创建结果接口
interface AiTaskResult {
  success: boolean;
  data?: {
    output: {
      task_id: string;
      task_status: string;
    };
    request_id: string;
  };
  error?: any;
}

Page({
  data: {
    prompt: '',
    negativePrompt: '',
    generating: false,
    suggestedTags: ['写实', '动漫', '电影感', '梦幻', '油画', '水彩'],
    examplePrompts: [
      '少女站在花海中，阳光明媚，动漫风格，清新色调',
      '科幻城市夜景，霓虹灯光，未来感，赛博朋克风格',
      '古代东方宫殿内景，龙柱雕刻，红色装饰，金色点缀，壮观',
      '宇航员站在外星球表面，远处有巨大行星，写实风格，科幻'
    ],
    envId: 'aihuatu-5gl6dhqt6d05ca01'
  },

  onLoad(options: any) {
    // 页面加载时执行
    // 确保云环境已初始化
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: this.data.envId,
        traceUser: true,
      });
    }

    // 如果从结果页传回来的提示词，填充到输入框
    if (options.prompt) {
      this.setData({
        prompt: decodeURIComponent(options.prompt)
      });
    }

    if (options.negativePrompt) {
      this.setData({
        negativePrompt: decodeURIComponent(options.negativePrompt)
      });
    }
  },

  // 返回上一页
  onBack() {
    wx.navigateBack();
  },

  // 处理正向提示词变更
  onPromptChange(e: any) {
    this.setData({
      prompt: e.detail.value
    });
  },

  // 处理负向提示词变更
  onNegativePromptChange(e: any) {
    this.setData({
      negativePrompt: e.detail.value
    });
  },

  // 处理标签点击
  onTagClick(e: any) {
    const tag = e.currentTarget.dataset.tag;
    let currentPrompt = this.data.prompt;
    
    // 如果提示词末尾已有逗号或者为空，直接添加标签
    if (currentPrompt === '' || currentPrompt.endsWith('，') || currentPrompt.endsWith(',')) {
      currentPrompt = currentPrompt + tag;
    } else {
      // 否则添加逗号和标签
      currentPrompt = currentPrompt + '，' + tag;
    }
    
    this.setData({
      prompt: currentPrompt
    });
  },

  // 处理示例点击
  onExampleClick(e: any) {
    const examplePrompt = e.currentTarget.dataset.prompt;
    
    wx.showModal({
      title: '使用此示例',
      content: '是否使用此示例替换当前输入？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            prompt: examplePrompt
          });
        }
      }
    });
  },

  // 生成图片
  async onGenerateClick() {
    if (!this.data.prompt.trim()) {
      wx.showToast({
        title: '请输入画面提示词',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      generating: true
    });
    
    wx.showLoading({
      title: '正在创建任务...',
      mask: true
    });
    
    try {
      // 调用云函数创建AI绘图任务
      const createResult = await wx.cloud.callFunction({
        name: 'aiGenerate',
        data: {
          action: 'createTask',
          params: {
            prompt: this.data.prompt,
            negativePrompt: this.data.negativePrompt,
            n: 1,
            size: '1024*1024'
          }
        }
      });
      
      // 处理返回结果
      const aiResult = createResult.result as AiTaskResult;
      
      if (!aiResult.success || !aiResult.data || !aiResult.data.output || !aiResult.data.output.task_id) {
        throw new Error('创建AI绘图任务失败: ' + (aiResult.error ? JSON.stringify(aiResult.error) : '未知错误'));
      }
      
      // 获取任务ID
      const taskId = aiResult.data.output.task_id;
      console.log('AI绘图任务创建成功, taskId:', taskId);
      
      wx.hideLoading();
      wx.showLoading({
        title: '生成图片中...',
        mask: true
      });
      
      // 等待2秒，然后跳转到结果页面
      setTimeout(() => {
        wx.hideLoading();
        this.setData({
          generating: false
        });
        
        // 跳转到结果页
        wx.navigateTo({
          url: `/pages/result/index?prompt=${encodeURIComponent(this.data.prompt)}&negativePrompt=${encodeURIComponent(this.data.negativePrompt)}&taskId=${taskId}`
        });
      }, 2000);
      
    } catch (error) {
      console.error('生成图片失败:', error);
      wx.hideLoading();
      this.setData({
        generating: false
      });
      
      wx.showToast({
        title: '生成图片失败，请重试',
        icon: 'none'
      });
    }
  }
}); 
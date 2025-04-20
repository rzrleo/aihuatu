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

  onLoad() {
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
    
    // 模拟生成过程
    wx.showLoading({
      title: '正在生成图片...',
      mask: true
    });
    
    try {
      // 这里实际项目中应该调用AI服务API生成图片
      // 在这个原型中我们使用随机图片来模拟

      // 先获取用户的OpenID，确保图片关联到用户
      const loginRes = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      });
      
      const cloudResult = loginRes.result as CloudFunctionResult;
      if (!cloudResult || !cloudResult.openid) {
        throw new Error('获取用户OpenID失败');
      }
      
      // 模拟生成图片延迟
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 生成随机图片ID，实际项目中这里应是AI服务返回的图片URL
      const randomId = Math.floor(Math.random() * 1000);
      const mockImageUrl = `https://picsum.photos/800/800?random=${randomId}`;
      
      // 模拟图片上传到云存储
      // 实际项目中，这里应该是将AI服务生成的图片上传到云存储
      
      // 创建数据库记录
      const db = wx.cloud.database();
      const dbResult = await db.collection('images').add({
        data: {
          prompt: this.data.prompt,
          negativePrompt: this.data.negativePrompt,
          fileID: mockImageUrl, // 实际应该是云存储返回的fileID
          createTime: db.serverDate(),
          status: 'completed'
        }
      });
      
      const addResult = dbResult as DbOperationResult;
      if (!addResult._id) {
        throw new Error('保存图片记录失败');
      }
      
      wx.hideLoading();
      this.setData({
        generating: false
      });
      
      // 生成完成后携带参数跳转到结果页
      wx.navigateTo({
        url: `/pages/result/index?prompt=${encodeURIComponent(this.data.prompt)}&negativePrompt=${encodeURIComponent(this.data.negativePrompt)}&imageUrl=${encodeURIComponent(mockImageUrl)}&imageId=${addResult._id}`
      });
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
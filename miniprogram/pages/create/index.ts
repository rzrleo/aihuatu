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
    ]
  },

  onLoad() {
    // 页面加载时执行
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
  onGenerateClick() {
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
    
    // 模拟AI生成延迟
    setTimeout(() => {
      wx.hideLoading();
      this.setData({
        generating: false
      });
      
      // 生成完成后携带参数跳转到结果页
      wx.navigateTo({
        url: `/pages/result/index?prompt=${encodeURIComponent(this.data.prompt)}&negativePrompt=${encodeURIComponent(this.data.negativePrompt)}`
      });
    }, 2000);
  }
}); 
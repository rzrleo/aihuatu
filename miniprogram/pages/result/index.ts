Page({
  data: {
    prompt: '',
    negativePrompt: '',
    imageUrl: '',
    loading: false
  },

  onLoad(options: any) {
    if (options.prompt) {
      this.setData({
        prompt: decodeURIComponent(options.prompt),
        negativePrompt: options.negativePrompt ? decodeURIComponent(options.negativePrompt) : ''
      });
      
      // 生成随机图片作为示例（实际中应该调用AI服务生成）
      this.generateImage();
    }
  },

  // 返回上一页
  onBack() {
    wx.navigateBack();
  },

  // 生成图片
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
    this.generateImage();
  },

  // 发布图片
  onPublishClick() {
    wx.showLoading({
      title: '正在发布...',
      mask: true
    });

    // 模拟发布过程
    setTimeout(() => {
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
    }, 1000);
  }
}); 
Page({
  data: {
    // ... existing code ...
  },

  onEditProfile() {
    wx.navigateTo({
      url: '/pages/usercenter/edit/index',
    });
  },
}) 
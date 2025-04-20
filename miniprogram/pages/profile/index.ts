// index.ts
interface UserInfo {
  nickName: string;
  avatarUrl: string;
  userId: string;
}

interface ImageItem {
  id: number;
  imageUrl: string;
  prompt: string;
}

Page({
  data: {
    isLoggedIn: false,
    userInfo: null as UserInfo | null,
    myImages: [] as ImageItem[]
  },

  onLoad() {
    // 检查是否已登录
    this.checkLoginStatus();
  },

  onShow() {
    // 每次显示页面时，如果已登录则刷新我的图片
    if (this.data.isLoggedIn) {
      this.loadMyImages();
    }
  },

  // 检查登录状态
  checkLoginStatus() {
    // 从本地存储获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    
    if (userInfo) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      });
      
      // 加载我的图片
      this.loadMyImages();
    }
  },

  // 登录处理
  onLogin() {
    // 显示加载中
    wx.showLoading({
      title: '登录中...',
    });
    
    // 模拟微信登录
    setTimeout(() => {
      // 模拟用户数据
      const mockUserInfo: UserInfo = {
        nickName: '微信用户12345',
        avatarUrl: 'https://picsum.photos/200/200?random=user',
        userId: '100000123'
      };
      
      // 保存到本地存储
      wx.setStorageSync('userInfo', mockUserInfo);
      
      this.setData({
        isLoggedIn: true,
        userInfo: mockUserInfo
      });
      
      // 加载我的图片
      this.loadMyImages();
      
      wx.hideLoading();
      
      // 显示成功提示
      wx.showToast({
        title: '登录成功',
        icon: 'success'
      });
    }, 1500);
  },

  // 加载我的图片
  loadMyImages() {
    // 模拟加载用户图片数据
    setTimeout(() => {
      // 模拟空状态，取消下面注释可以显示有图片的情况
      const mockImages: ImageItem[] = [
        {
          id: 101,
          imageUrl: 'https://picsum.photos/400/400?random=10',
          prompt: '梦幻童话森林，魔法生物'
        },
        {
          id: 102,
          imageUrl: 'https://picsum.photos/400/400?random=11',
          prompt: '科技感十足的太空站'
        },
        {
          id: 103,
          imageUrl: 'https://picsum.photos/400/400?random=12',
          prompt: '水晶城堡与彩虹'
        },
        {
          id: 104,
          imageUrl: 'https://picsum.photos/400/400?random=13',
          prompt: '冰雪覆盖的山峰日落'
        }
      ];
      
      this.setData({
        // myImages: [] // 空状态测试
        myImages: mockImages // 有图片状态
      });
    }, 500);
  },

  // 跳转到创建图片页面
  onCreateImage() {
    wx.navigateTo({
      url: '/pages/create/index'
    });
  }
}); 
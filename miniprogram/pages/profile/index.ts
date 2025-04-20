// index.ts
interface UserInfo {
  nickName: string;
  avatarUrl: string;
  userId: string;
  _openid?: string;
  _id?: string;
}

interface ImageItem {
  id: number;
  imageUrl: string;
  prompt: string;
  _id?: string;
  _openid?: string;
  createTime?: number;
}

// 云函数返回结果接口
interface CloudFunctionResult {
  openid?: string;
  [key: string]: any;
}

// 用户图片结果接口
interface UserImagesResult {
  success: boolean;
  data?: any[];
  error?: any;
}

Page({
  data: {
    isLoggedIn: false,
    userInfo: null as UserInfo | null,
    myImages: [] as ImageItem[],
    envId: 'aihuatu-5gl6dhqt6d05ca01',
    isLoading: false
  },

  onLoad() {
    // 初始化云环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: this.data.envId,
        traceUser: true,
      });
      
      // 检查是否已登录
      this.checkLoginStatus();
    }
  },

  onShow() {
    // 每次显示页面时，如果已登录则刷新用户信息和图片
    if (this.data.isLoggedIn) {
      // 刷新用户信息
      this.refreshUserInfo();
      // 刷新图片列表
      this.loadMyImages();
    }
  },

  // 检查登录状态
  async checkLoginStatus() {
    this.setData({ isLoading: true });
    
    try {
      // 调用云函数获取用户OpenID
      const { result } = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      });
      
      const cloudResult = result as CloudFunctionResult;
      if (cloudResult && cloudResult.openid) {
        const openid = cloudResult.openid;
        console.log('获取到用户openid:', openid);
        
        // 根据openid查询用户数据
        const db = wx.cloud.database();
        const userResult = await db.collection('users').where({
          _openid: openid
        }).get();
        
        if (userResult && userResult.data && userResult.data.length > 0) {
          // 用户存在，设置登录状态
          const userInfo = userResult.data[0] as UserInfo;
          this.setData({
            isLoggedIn: true,
            userInfo: userInfo,
            isLoading: false
          });
          
          // 加载用户创建的图片
          this.loadMyImages();
        } else {
          // 用户不存在，保持未登录状态
          this.setData({ isLoading: false });
        }
      } else {
        this.setData({ isLoading: false });
        console.error('获取用户openid失败');
      }
    } catch (error) {
      this.setData({ isLoading: false });
      console.error('检查登录状态出错:', error);
    }
  },

  // 处理用户登录
  async onLogin() {
    // 显示加载中
    wx.showLoading({
      title: '登录中...',
    });
    
    try {
      // 获取用户信息
      const userProfileRes = await wx.getUserProfile({
        desc: '用于完善用户资料'
      });
      
      if (userProfileRes) {
        // 获取云函数返回的openid
        const { result } = await wx.cloud.callFunction({
          name: 'login',
          data: {}
        });
        
        const cloudResult = result as CloudFunctionResult;
        if (cloudResult && cloudResult.openid) {
          const openid = cloudResult.openid;
          
          // 构建用户信息
          const userInfo: UserInfo = {
            nickName: userProfileRes.userInfo.nickName,
            avatarUrl: userProfileRes.userInfo.avatarUrl,
            userId: openid.slice(-8) // 用openid末8位作为用户ID展示
          };
          
          // 查询用户是否已经存在
          const db = wx.cloud.database();
          const userResult = await db.collection('users').where({
            _openid: openid
          }).get();
          
          if (userResult.data.length === 0) {
            // 用户不存在，添加到数据库
            await db.collection('users').add({
              data: {
                ...userInfo,
                createTime: db.serverDate(),
                updateTime: db.serverDate()
              }
            });
            console.log('新用户注册成功');
          } else {
            // 用户已存在，更新用户信息
            const docId = userResult.data[0]._id;
            if (docId) {
              await db.collection('users').doc(docId).update({
                data: {
                  nickName: userInfo.nickName,
                  avatarUrl: userInfo.avatarUrl,
                  updateTime: db.serverDate()
                }
              });
              console.log('更新用户信息成功');
            }
          }
          
          // 设置登录状态
          this.setData({
            isLoggedIn: true,
            userInfo: userInfo
          });
          
          // 加载用户图片
          this.loadMyImages();
          
          // 显示成功提示
          wx.hideLoading();
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          });
        } else {
          throw new Error('获取用户openid失败');
        }
      }
    } catch (error) {
      wx.hideLoading();
      console.error('登录失败:', error);
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      });
    }
  },

  // 加载我的图片
  async loadMyImages() {
    if (!this.data.isLoggedIn) return;
    
    this.setData({ isLoading: true });
    
    try {
      console.log('开始加载用户图片列表');
      
      // 调用云函数获取用户发布的图片
      const res = await wx.cloud.callFunction({
        name: 'aiGenerate',
        data: {
          action: 'getUserImages'
        }
      });
      
      console.log('获取用户图片云函数返回:', res);
      const result = res.result as UserImagesResult;
      
      if (result && result.success && result.data) {
        console.log(`获取到${result.data.length}张用户图片`);
        
        // 处理返回的图片数据
        const images: ImageItem[] = result.data.map((item: any, index: number) => {
          console.log(`处理图片 ${index + 1}:`, item.fileID);
          return {
            id: index + 101, // 生成一个临时ID
            imageUrl: item.fileID, // 云存储的图片fileID
            prompt: item.prompt || '未设置提示词',
            _id: item._id,
            _openid: item._openid,
            createTime: item.createTime
          };
        });
        
        this.setData({
          myImages: images,
          isLoading: false
        });
      } else {
        console.warn('未获取到用户图片或返回格式错误:', result);
        this.setData({
          myImages: [],
          isLoading: false
        });
        
        if (result && result.error) {
          console.error('获取用户图片列表失败:', result.error);
        }
      }
    } catch (error) {
      console.error('加载图片失败:', error);
      this.setData({
        myImages: [],
        isLoading: false
      });
      
      wx.showToast({
        title: '加载图片失败',
        icon: 'none'
      });
    }
  },

  // 跳转到创建图片页面
  onCreateImage() {
    wx.navigateTo({
      url: '/pages/create/index'
    });
  },

  // 跳转到编辑个人资料页面
  onEditProfile() {
    wx.navigateTo({
      url: '/pages/profile/edit/index'
    });
  },

  // 点击图片查看详情
  onImageClick(e: any) {
    const index = e.currentTarget.dataset.index;
    const image = this.data.myImages[index];
    
    if (image && image._id) {
      // 如果有_id，跳转到结果页查看详情
      wx.navigateTo({
        url: `/pages/result/index?imageId=${image._id}`
      });
    } else if (image) {
      // 没有_id但有图片信息，传递参数
      wx.navigateTo({
        url: `/pages/result/index?prompt=${encodeURIComponent(image.prompt)}&imageUrl=${encodeURIComponent(image.imageUrl)}`
      });
    }
  },

  // 刷新用户信息（不包含登录状态检查）
  async refreshUserInfo() {
    try {
      // 调用云函数获取用户OpenID
      const { result } = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      });
      
      const cloudResult = result as CloudFunctionResult;
      if (cloudResult && cloudResult.openid) {
        const openid = cloudResult.openid;
        
        // 根据openid查询用户数据
        const db = wx.cloud.database();
        const userResult = await db.collection('users').where({
          _openid: openid
        }).get();
        
        if (userResult && userResult.data && userResult.data.length > 0) {
          // 用户存在，更新用户信息
          const userInfo = userResult.data[0] as UserInfo;
          this.setData({
            userInfo: userInfo
          });
        }
      }
    } catch (error) {
      console.error('刷新用户信息出错:', error);
    }
  }
}); 
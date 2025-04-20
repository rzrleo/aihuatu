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

// 用户信息接口
interface UserInfo {
  nickName: string;
  avatarUrl: string;
  userId: string;
  _openid?: string;
  _id?: string;
}

// 上传结果接口
interface UploadResult {
  fileID: string;
  statusCode: number;
  errMsg: string;
}

Page({
  data: {
    userInfo: null as UserInfo | null,
    isLoading: false,
    envId: 'aihuatu-5gl6dhqt6d05ca01',
    docId: '', // 数据库记录ID
    tempFilePath: '', // 临时文件路径
    hasSelectedImage: false, // 是否已选择图片
    uploadProgress: 0, // 上传进度
    inputNickName: '', // 用户输入的昵称
    hasChangedNickName: false // 是否修改了昵称
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
      
      // 加载用户信息
      this.loadUserInfo();
    }
  },

  // 返回上一页
  onBack() {
    wx.navigateBack();
  },

  // 加载用户信息
  async loadUserInfo() {
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
          // 用户存在，设置用户信息
          const userInfo = userResult.data[0] as UserInfo;
          const docId = userResult.data[0]._id as string;
          
          this.setData({
            userInfo: userInfo,
            inputNickName: userInfo.nickName, // 初始化昵称输入框
            isLoading: false,
            docId: docId || ''
          });
        } else {
          this.setData({ isLoading: false });
          wx.showToast({
            title: '获取用户信息失败',
            icon: 'none'
          });
          
          // 返回上一页
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      } else {
        this.setData({ isLoading: false });
        console.error('获取用户openid失败');
        wx.navigateBack();
      }
    } catch (error) {
      this.setData({ isLoading: false });
      console.error('加载用户信息出错:', error);
      wx.showToast({
        title: '加载用户信息失败',
        icon: 'none'
      });
    }
  },

  // 选择头像图片
  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      camera: 'front',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          tempFilePath: tempFilePath,
          hasSelectedImage: true
        });
      }
    });
  },

  // 处理昵称变更
  onNickNameChange(e: any) {
    const newNickName = e.detail.value;
    this.setData({
      inputNickName: newNickName,
      hasChangedNickName: newNickName !== this.data.userInfo?.nickName
    });
  },

  // 保存用户信息
  async onSaveProfile() {
    if (!this.data.userInfo) {
      wx.showToast({
        title: '用户信息不存在',
        icon: 'none'
      });
      return;
    }
    
    // 验证昵称
    if (!this.data.inputNickName.trim()) {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none'
      });
      return;
    }
    
    this.setData({ isLoading: true });
    
    try {
      // 如果有新选择的头像，先上传图片
      let avatarUrl = this.data.userInfo.avatarUrl;
      
      if (this.data.hasSelectedImage && this.data.tempFilePath) {
        avatarUrl = await this.uploadAvatar();
      }
      
      if (!this.data.docId) {
        throw new Error('用户记录ID不存在');
      }
      
      // 更新用户信息
      const db = wx.cloud.database();
      await db.collection('users').doc(this.data.docId).update({
        data: {
          avatarUrl: avatarUrl,
          nickName: this.data.inputNickName, // 更新昵称
          updateTime: db.serverDate()
        }
      });
      
      // 更新本地用户信息
      if (this.data.userInfo) {
        const updatedUserInfo = {
          ...this.data.userInfo,
          avatarUrl: avatarUrl,
          nickName: this.data.inputNickName
        };
        
        this.setData({
          userInfo: updatedUserInfo,
          isLoading: false
        });
      } else {
        this.setData({ isLoading: false });
      }
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      this.setData({ isLoading: false });
      console.error('保存用户信息失败:', error);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    }
  },

  // 上传头像
  async uploadAvatar(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.data.tempFilePath) {
        reject(new Error('头像文件不存在'));
        return;
      }
      
      // 先获取云函数返回的openid
      wx.cloud.callFunction({
        name: 'login',
        data: {}
      }).then(loginRes => {
        // 生成云存储路径和扩展名
        const fileExtension = this.data.tempFilePath.match(/\.(\w+)$/);
        const ext = fileExtension ? fileExtension[1] : 'png';
        const cloudPath = `avatars/${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${ext}`;
        
        // 上传文件
        const uploadTask = wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: this.data.tempFilePath,
          success: (res: any) => {
            const result = res as UploadResult;
            if (result.fileID) {
              console.log('头像上传成功, fileID:', result.fileID);
              resolve(result.fileID);
            } else {
              reject(new Error('上传失败，未获取到文件ID'));
            }
          },
          fail: (err) => {
            console.error('上传头像失败:', err);
            reject(err);
          }
        });
        
        // 监听上传进度
        uploadTask.onProgressUpdate((res) => {
          this.setData({
            uploadProgress: res.progress
          });
        });
      }).catch(err => {
        console.error('获取用户信息失败:', err);
        reject(err);
      });
    });
  }
}); 
interface UserInfo {
  nickName: string;
  avatarUrl: string;
  userId: string;
}

interface ImageItem {
  id: number;
  imageUrl: string;
  prompt: string;
  _id?: string;
  _openid?: string;
  createTime?: any;
  publishTime?: any;
  user?: UserInfo;
}

// 云函数结果接口
interface PublicImagesResult {
  success: boolean;
  data?: any[];
  total?: number;
  error?: any;
}

// 云环境ID
const envId = 'aihuatu-5gl6dhqt6d05ca01';

Page({
  data: {
    imageList: [] as ImageItem[],
    loading: false,
    page: 0, // 从0开始计数
    pageSize: 10,
    hasMore: true,
    envId: envId
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
      
      this.loadImages();
    }
  },

  onReady() {
    // 页面渲染完成
  },

  onShow() {
    // 每次显示页面时刷新数据
    if (this.data.imageList.length > 0) {
      this.resetAndReload();
    }
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loading) {
      this.loadMoreImages();
    }
  },

  onPullDownRefresh() {
    this.resetAndReload();
    wx.stopPullDownRefresh();
  },

  async loadImages() {
    this.setData({ loading: true });

    try {
      console.log('开始加载首页图片列表, 页码:', this.data.page);
      
      // 显示加载中提示
      if (this.data.page === 0) {
        wx.showNavigationBarLoading();
      }
      
      // 调用云函数获取公开发布的图片
      const res = await wx.cloud.callFunction({
        name: 'aiGenerate',
        data: {
          action: 'getPublicImages',
          params: {
            pageIndex: this.data.page,
            pageSize: this.data.pageSize
          }
        }
      });
      
      console.log('获取公开图片云函数返回:', res);
      const result = res.result as PublicImagesResult;
      
      if (result && result.success && result.data && result.data.length > 0) {
        console.log(`获取到${result.data.length}张公开图片`);
        
        // 处理返回的图片数据
        const images: ImageItem[] = result.data.map((item: any, index: number) => {
          return {
            id: index + 1,
            imageUrl: item.fileID,
            prompt: item.prompt || '',
            _id: item._id,
            _openid: item._openid,
            createTime: item.createTime,
            publishTime: item.publishTime,
            user: item.user
          };
        });
        
        this.setData({
          imageList: images,
          loading: false,
          hasMore: result.data.length >= this.data.pageSize
        });
      } else {
        console.warn('未获取到公开图片或返回格式错误:', result);
        
        // 没有数据时，显示空状态
        this.setData({
          imageList: [],
          loading: false,
          hasMore: false
        });
      }
    } catch (error) {
      console.error('加载图片失败:', error);
      
      this.setData({ 
        loading: false,
        hasMore: false
      });
      
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
    }
  },

  async loadMoreImages() {
    if (this.data.loading || !this.data.hasMore) return;
    
    this.setData({ 
      loading: true,
      page: this.data.page + 1
    });

    try {
      console.log('加载更多图片, 页码:', this.data.page);
      
      // 调用云函数获取更多图片
      const res = await wx.cloud.callFunction({
        name: 'aiGenerate',
        data: {
          action: 'getPublicImages',
          params: {
            pageIndex: this.data.page,
            pageSize: this.data.pageSize
          }
        }
      });
      
      const result = res.result as PublicImagesResult;
      
      if (result && result.success && result.data && result.data.length > 0) {
        console.log(`获取到${result.data.length}张更多图片`);
        
        // 处理返回的图片数据
        const newImages: ImageItem[] = result.data.map((item: any, index: number) => {
          return {
            id: this.data.imageList.length + index + 1,
            imageUrl: item.fileID,
            prompt: item.prompt || '',
            _id: item._id,
            _openid: item._openid,
            createTime: item.createTime,
            publishTime: item.publishTime,
            user: item.user
          };
        });
        
        this.setData({
          imageList: [...this.data.imageList, ...newImages],
          loading: false,
          hasMore: result.data.length >= this.data.pageSize
        });
      } else {
        console.log('没有更多图片了');
        this.setData({
          loading: false,
          hasMore: false
        });
      }
    } catch (error) {
      console.error('加载更多图片失败:', error);
      this.setData({
        loading: false
      });
      
      // 发生错误时不显示没有更多的提示，让用户可以再次尝试加载
      wx.showToast({
        title: '加载失败，请上滑重试',
        icon: 'none'
      });
    }
  },

  // 加载示例图片（当数据库中没有图片时）
  loadSampleImages() {
    // 模拟数据 - 添加用户信息
    const mockImages: ImageItem[] = [
      {
        id: 1,
        imageUrl: 'https://picsum.photos/400/400?random=1',
        prompt: '梦幻星空下的女孩，动漫风格',
        user: {
          nickName: '示例用户1',
          avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
          userId: 'sample1'
        }
      },
      {
        id: 2,
        imageUrl: 'https://picsum.photos/400/600?random=2',
        prompt: '霓虹灯下的赛博朋克城市街道',
        user: {
          nickName: '示例用户2',
          avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
          userId: 'sample2'
        }
      },
      {
        id: 3,
        imageUrl: 'https://picsum.photos/400/300?random=3',
        prompt: '森林中的小木屋，晨雾缭绕，写实风格',
        user: {
          nickName: '示例用户3',
          avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
          userId: 'sample3'
        }
      },
      {
        id: 4,
        imageUrl: 'https://picsum.photos/400/500?random=4',
        prompt: '未来科技感十足的智能机器人，电影风格',
        user: {
          nickName: '示例用户4',
          avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
          userId: 'sample4'
        }
      },
      {
        id: 5,
        imageUrl: 'https://picsum.photos/400/450?random=5',
        prompt: '海底宫殿与美人鱼，梦幻水彩风',
        user: {
          nickName: '示例用户5',
          avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
          userId: 'sample5'
        }
      },
      {
        id: 6,
        imageUrl: 'https://picsum.photos/400/550?random=6',
        prompt: '宇宙中漂浮的宇航员，真实感照片风格',
        user: {
          nickName: '示例用户6',
          avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
          userId: 'sample6'
        }
      }
    ];

    this.setData({
      imageList: mockImages,
      loading: false,
      hasMore: false
    });
  },

  resetAndReload() {
    this.setData({
      imageList: [],
      page: 0,
      hasMore: true
    });
    this.loadImages();
  },

  onFabClick() {
    wx.navigateTo({
      url: '/pages/create/index'
    });
  },

  // 点击图片查看详情
  onImageClick(e: any) {
    const index = e.currentTarget.dataset.index;
    const image = this.data.imageList[index];
    
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
  }
}); 
interface ImageItem {
  id: number;
  imageUrl: string;
  prompt: string;
  _id?: string;
  _openid?: string;
  createTime?: number;
}

// 云环境ID
const envId = 'aihuatu-5gl6dhqt6d05ca01';

Page({
  data: {
    imageList: [] as ImageItem[],
    loading: false,
    page: 1,
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
      const db = wx.cloud.database();
      const result = await db.collection('images')
        .where({
          published: true // 只获取已发布的图片
        })
        .orderBy('publishTime', 'desc')
        .limit(this.data.pageSize)
        .get();
      
      if (result && result.data && result.data.length > 0) {
        // 处理返回的图片数据
        const images: ImageItem[] = result.data.map((item: any, index: number) => ({
          id: index + 1,
          imageUrl: item.fileID,
          prompt: item.prompt,
          _id: item._id,
          _openid: item._openid,
          createTime: item.createTime
        }));
        
        this.setData({
          imageList: images,
          loading: false,
          hasMore: result.data.length >= this.data.pageSize
        });
      } else {
        // 没有数据时，使用示例数据（在实际项目中可以改为空数组）
        this.loadSampleImages();
      }
    } catch (error) {
      console.error('加载图片失败:', error);
      this.setData({ loading: false });
      
      // 失败时使用示例数据
      this.loadSampleImages();
    }
  },

  async loadMoreImages() {
    if (this.data.loading) return;
    
    this.setData({ 
      loading: true,
      page: this.data.page + 1
    });

    try {
      const db = wx.cloud.database();
      const result = await db.collection('images')
        .where({
          published: true
        })
        .orderBy('publishTime', 'desc')
        .skip(this.data.page * this.data.pageSize)
        .limit(this.data.pageSize)
        .get();
      
      if (result && result.data && result.data.length > 0) {
        // 处理返回的图片数据
        const newImages: ImageItem[] = result.data.map((item: any, index: number) => ({
          id: this.data.imageList.length + index + 1,
          imageUrl: item.fileID,
          prompt: item.prompt,
          _id: item._id,
          _openid: item._openid,
          createTime: item.createTime
        }));
        
        this.setData({
          imageList: [...this.data.imageList, ...newImages],
          loading: false,
          hasMore: result.data.length >= this.data.pageSize
        });
      } else {
        this.setData({
          loading: false,
          hasMore: false
        });
      }
    } catch (error) {
      console.error('加载更多图片失败:', error);
      this.setData({
        loading: false,
        hasMore: false
      });
    }
  },

  // 加载示例图片（当数据库中没有图片时）
  loadSampleImages() {
    // 模拟数据
    const mockImages: ImageItem[] = [
      {
        id: 1,
        imageUrl: 'https://picsum.photos/400/400?random=1',
        prompt: '梦幻星空下的女孩，动漫风格'
      },
      {
        id: 2,
        imageUrl: 'https://picsum.photos/400/600?random=2',
        prompt: '霓虹灯下的赛博朋克城市街道'
      },
      {
        id: 3,
        imageUrl: 'https://picsum.photos/400/300?random=3',
        prompt: '森林中的小木屋，晨雾缭绕，写实风格'
      },
      {
        id: 4,
        imageUrl: 'https://picsum.photos/400/500?random=4',
        prompt: '未来科技感十足的智能机器人，电影风格'
      },
      {
        id: 5,
        imageUrl: 'https://picsum.photos/400/450?random=5',
        prompt: '海底宫殿与美人鱼，梦幻水彩风'
      },
      {
        id: 6,
        imageUrl: 'https://picsum.photos/400/550?random=6',
        prompt: '宇宙中漂浮的宇航员，真实感照片风格'
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
      page: 1,
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
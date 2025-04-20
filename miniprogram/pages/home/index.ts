interface ImageItem {
  id: number;
  imageUrl: string;
  prompt: string;
}

Page({
  data: {
    imageList: [] as ImageItem[],
    loading: false,
    page: 1,
    hasMore: true
  },

  onLoad() {
    this.loadImages();
  },

  onReady() {
    // 页面渲染完成
  },

  onShow() {
    // 页面显示
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

  loadImages() {
    this.setData({ loading: true });

    // 模拟数据
    setTimeout(() => {
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
        loading: false
      });
    }, 1000);
  },

  loadMoreImages() {
    if (this.data.loading) return;
    
    this.setData({ 
      loading: true,
      page: this.data.page + 1
    });

    // 模拟加载更多数据
    setTimeout(() => {
      // 模拟第二页数据
      if (this.data.page > 2) {
        // 没有更多数据
        this.setData({
          loading: false,
          hasMore: false
        });
        return;
      }

      const moreImages: ImageItem[] = [
        {
          id: 7,
          imageUrl: 'https://picsum.photos/400/350?random=7',
          prompt: '山顶日落，一个人眺望远方，油画效果'
        },
        {
          id: 8,
          imageUrl: 'https://picsum.photos/400/400?random=8',
          prompt: '古代东方城市街景，人来人往，水墨画风格'
        },
        {
          id: 9,
          imageUrl: 'https://picsum.photos/400/480?random=9',
          prompt: '雪山下的森林和小屋，冬季风光'
        },
        {
          id: 10,
          imageUrl: 'https://picsum.photos/400/420?random=10',
          prompt: '热带海滩日落，椰树剪影，浪漫场景'
        }
      ];

      this.setData({
        imageList: [...this.data.imageList, ...moreImages],
        loading: false
      });
    }, 1000);
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
  }
}); 
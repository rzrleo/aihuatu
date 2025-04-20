// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 阿里云API配置
const baseURL = 'https://dashscope.aliyuncs.com'
const API_KEY = process.env.DASHSCOPE_API_KEY
const modelName = 'wanx2.1-t2i-turbo'

// 创建AI绘图任务
async function createAiTask(prompt, negativePrompt = '', n = 1, size = '1024*1024') {
  try {
    const response = await axios({
      method: 'POST',
      url: `${baseURL}/api/v1/services/aigc/text2image/image-synthesis`,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'X-DashScope-Async': 'enable'
      },
      data: {
        model: modelName,
        input: {
          prompt: prompt,
          negative_prompt: negativePrompt
        },
        parameters: {
          size: size,
          n: n,
          prompt_extend: true
        }
      }
    })

    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    console.error('创建AI绘图任务失败:', error.response ? error.response.data : error.message)
    return {
      success: false,
      error: error.response ? error.response.data : { message: error.message }
    }
  }
}

// 查询AI绘图任务结果
async function queryAiTask(taskId) {
  try {
    const response = await axios({
      method: 'GET',
      url: `${baseURL}/api/v1/tasks/${taskId}`,
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    })

    return {
      success: true,
      data: response.data
    }
  } catch (error) {
    console.error('查询AI绘图任务失败:', error.response ? error.response.data : error.message)
    return {
      success: false,
      error: error.response ? error.response.data : { message: error.message }
    }
  }
}

// 从网络下载图片并上传到云存储
async function downloadAndUploadImage(imageUrl) {
  try {
    console.log('开始处理图片:', imageUrl);
    
    // 如果已经是云存储的文件ID，则直接返回
    if (imageUrl.startsWith('cloud://')) {
      console.log('图片已经是云存储文件，直接使用:', imageUrl);
      return {
        success: true,
        fileID: imageUrl,
        cloudPath: imageUrl
      };
    }

    // 下载图片
    console.log('开始下载外部图片');
    const response = await axios({
      method: 'GET',
      url: imageUrl,
      responseType: 'arraybuffer',
      timeout: 30000, // 30秒超时
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    console.log('图片下载成功，大小:', response.data.length, '字节');

    // 提取文件名（时间戳+随机数）
    const fileName = `${Date.now()}_${Math.floor(Math.random() * 10000)}.png`;
    const cloudPath = `images/${fileName}`;

    console.log('开始上传到云存储，路径:', cloudPath);
    // 上传到云存储
    const result = await cloud.uploadFile({
      cloudPath: cloudPath,
      fileContent: response.data
    });

    console.log('上传云存储成功，fileID:', result.fileID);
    // 返回云文件ID
    return {
      success: true,
      fileID: result.fileID,
      cloudPath: cloudPath
    };
  } catch (error) {
    console.error('下载或上传图片失败:', error);
    return {
      success: false,
      error: error.message || '下载或上传图片失败'
    };
  }
}

// 发布图片到数据库
async function publishImage(imageUrl, prompt, negativePrompt, taskId, userId) {
  try {
    console.log('开始处理发布图片请求:', {
      imageUrl: imageUrl ? (imageUrl.substring(0, 20) + '...') : 'undefined', // 只记录URL前20个字符
      prompt: prompt,
      userId: userId
    });
    
    if (!imageUrl) {
      throw new Error('图片URL不能为空');
    }
    
    if (!userId) {
      throw new Error('用户ID不能为空，请确保用户已登录');
    }

    // 下载并上传图片到云存储
    const uploadResult = await downloadAndUploadImage(imageUrl);
    if (!uploadResult.success) {
      throw new Error('上传图片到云存储失败: ' + (uploadResult.error || '未知错误'));
    }

    // 获取用户信息
    const db = cloud.database();
    let userInfo = null;
    try {
      console.log('查询用户信息:', userId);
      const userResult = await db.collection('users').where({
        _openid: userId
      }).get();
      
      if (userResult && userResult.data && userResult.data.length > 0) {
        userInfo = userResult.data[0];
        console.log('获取到用户信息:', userInfo.nickName);
      } else {
        console.warn('未找到用户信息');
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }

    console.log('保存图片记录到数据库');
    // 保存记录到数据库
    const result = await db.collection('images').add({
      data: {
        prompt: prompt || '',
        negativePrompt: negativePrompt || '',
        fileID: uploadResult.fileID,
        originalUrl: imageUrl,
        taskId: taskId || '',
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
        published: true,
        publishTime: db.serverDate(),
        _openid: userId,
        user: userInfo ? {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
          userId: userInfo.userId
        } : null
      }
    });

    console.log('图片发布成功，记录ID:', result._id);
    return {
      success: true,
      fileID: uploadResult.fileID,
      imageId: result._id
    };
  } catch (error) {
    console.error('发布图片失败:', error);
    return {
      success: false,
      error: error.message || '发布图片失败'
    };
  }
}

// 获取用户的图片列表
async function getUserImages(userId) {
  try {
    console.log('开始获取用户图片列表, userId:', userId);
    
    if (!userId) {
      throw new Error('用户ID不能为空，请确保用户已登录');
    }
    
    const db = cloud.database();
    const result = await db.collection('images')
      .where({
        _openid: userId,
        published: true
      })
      .orderBy('publishTime', 'desc')
      .get();
    
    console.log(`找到用户图片 ${result.data.length} 张`);
    
    // 处理一下数据，确保关键字段存在
    const processedData = result.data.map(item => {
      // 确保所有必要的字段都存在
      return {
        ...item,
        prompt: item.prompt || '',
        negativePrompt: item.negativePrompt || '',
        fileID: item.fileID || '',
        _id: item._id || '',
        createTime: item.createTime || new Date(),
        publishTime: item.publishTime || item.createTime || new Date()
      };
    });

    return {
      success: true,
      data: processedData
    };
  } catch (error) {
    console.error('获取用户图片列表失败:', error);
    return {
      success: false,
      error: error.message || '获取用户图片列表失败'
    };
  }
}

// 获取所有公开发布的图片（带分页）
async function getPublicImages(pageIndex = 0, pageSize = 10) {
  try {
    console.log('获取公开发布图片列表, 页码:', pageIndex, '每页数量:', pageSize);
    
    const db = cloud.database();
    // 跳过的记录数
    const skip = pageIndex * pageSize;
    
    // 获取带用户信息的图片列表
    const result = await db.collection('images')
      .where({
        published: true // 只获取已发布的图片
      })
      .orderBy('publishTime', 'desc') // 按发布时间倒序
      .skip(skip)
      .limit(pageSize)
      .get();
    
    console.log(`查询到 ${result.data.length} 张公开图片`);
    
    // 处理数据，确保所有字段存在
    const processedData = result.data.map(item => {
      return {
        ...item,
        prompt: item.prompt || '',
        negativePrompt: item.negativePrompt || '',
        fileID: item.fileID || '',
        _id: item._id || '',
        createTime: item.createTime || new Date(),
        publishTime: item.publishTime || item.createTime || new Date(),
        // 确保用户信息存在，避免前端显示错误
        user: item.user || {
          nickName: '匿名用户',
          avatarUrl: 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0',
          userId: 'unknown'
        }
      };
    });

    return {
      success: true,
      data: processedData,
      total: processedData.length // 返回本次查询的数量
    };
  } catch (error) {
    console.error('获取公开图片列表失败:', error);
    return {
      success: false,
      error: error.message || '获取公开图片列表失败'
    };
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, params } = event
  const { OPENID } = cloud.getWXContext()

  // 根据不同的action执行不同的操作
  switch (action) {
    case 'createTask':
      return await createAiTask(
        params.prompt,
        params.negativePrompt || '',
        params.n || 1,
        params.size || '1024*1024'
      )

    case 'queryTask':
      return await queryAiTask(params.taskId)

    case 'publishImage':
      return await publishImage(
        params.imageUrl,
        params.prompt,
        params.negativePrompt,
        params.taskId,
        OPENID
      )

    case 'getUserImages':
      return await getUserImages(OPENID)
      
    case 'getPublicImages':
      return await getPublicImages(
        params?.pageIndex || 0, 
        params?.pageSize || 10
      )

    default:
      return {
        success: false,
        error: {
          message: '未知的操作类型'
        }
      }
  }
} 
/**
 * @fileoverview 会员中心页面逻辑
 * @description 处理积分展示、广告观看、积分领取等功能
 * @version 1.0.0
 */

const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    pointsInfo: {
      balance: 0,
      totalEarned: 0,
      totalConsumed: 0,
      todayWatched: 0,
      dailyLimit: 10,
      canWatchMore: true,
      defaultParseLimit: 3,
      freeParseUsed: 0,
      freeParseRemaining: 3
    },
    freeProgress: 0,
    rewardedVideoAd: null,
    isLoading: false,
    _pageAlive: true
  },

  safeSetData: function(data, callback) {
    if (!this.data._pageAlive) {
      return;
    }
    this.setData(data);
    if (callback) {
      callback();
    }
  },

  onLoad: function(options) {
    this.checkLoginStatus();
  },

  onShow: function() {
    this.checkLoginStatus();
  },

  onUnload: function() {
    this.data._pageAlive = false;
  },

  onHide: function() {
  },

  checkLoginStatus: function() {
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    const userInfo = wx.getStorageSync('userInfo');

    if (isLoggedIn && userInfo) {
      this.safeSetData({
        isLoggedIn: true,
        userInfo: {
          avatar: userInfo.avatarUrl || userInfo.avatar || '/images/default-avatar.png',
          nickname: userInfo.nickName || userInfo.nickname || '用户',
          userId: userInfo.userId || '---',
          userToken: userInfo.userToken || userInfo.userId || '---'
        }
      }, () => {
        this.loadPointsInfo();
      });
    } else {
      this.safeSetData({
        isLoggedIn: false,
        userInfo: null
      });
    }
  },

  goToLogin: function() {
    wx.switchTab({
      url: '/pages/profile/profile'
    });
  },

  loadPointsInfo: function() {
    const userInfo = wx.getStorageSync('userInfo');
    console.log('=== loadPointsInfo ===');
    console.log('userInfo:', userInfo);
    
    const token = userInfo.userToken || userInfo.userId;
    if (!userInfo || !token) {
      console.log('没有userToken，无法获取积分');
      return;
    }

    wx.showLoading({ title: '加载中...' });

    api.getPointsInfo(token)
      .then((res) => {
        wx.hideLoading();
        console.log('积分接口返回:', res);
        if (res.success) {
          const data = res.data;
          const freeProgress = data.defaultParseLimit > 0 
            ? Math.round((data.freeParseUsed / data.defaultParseLimit) * 100) 
            : 0;
          
          this.safeSetData({
            pointsInfo: {
              balance: data.balance || 0,
              totalEarned: data.totalEarned || 0,
              totalConsumed: data.totalConsumed || 0,
              todayWatched: data.todayWatched || 0,
              dailyLimit: data.dailyLimit || 10,
              canWatchMore: data.canWatchMore !== false,
              defaultParseLimit: data.defaultParseLimit || 3,
              freeParseUsed: data.freeParseUsed || 0,
              freeParseRemaining: data.freeParseRemaining || 0
            },
            freeProgress: freeProgress
          });
        } else {
          wx.showToast({
            title: res.message || '加载失败',
            icon: 'none'
          });
        }
      })
      .catch((err) => {
        if (!this.data._pageAlive) {
          return;
        }
        wx.hideLoading();
        console.error('加载积分信息失败:', err);
        this.setDefaultPointsInfo();
      });
  },

  setDefaultPointsInfo: function() {
    this.safeSetData({
      pointsInfo: {
        balance: 0,
        totalEarned: 0,
        totalConsumed: 0,
        todayWatched: 0,
        dailyLimit: 10,
        canWatchMore: true,
        defaultParseLimit: 3,
        freeParseUsed: 0,
        freeParseRemaining: 3
      },
      freeProgress: 0
    });
  },

  initRewardedVideoAd: function() {
    if (!this.data._pageAlive) {
      return Promise.reject(new Error('页面已销毁'));
    }
    if (this.data.rewardedVideoAd) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const rewardedVideoAd = wx.createRewardedVideoAd({
        adUnitId: 'adunit-3660e8d4ad73ae62'
      });

      rewardedVideoAd.onLoad(() => {
        console.log('激励视频广告加载成功');
      });

      rewardedVideoAd.onError((err) => {
        console.error('激励视频广告加载失败:', err);
        wx.showToast({
          title: '广告加载失败，请稍后重试',
          icon: 'none'
        });
        this.data.rewardedVideoAd = null;
      });

      rewardedVideoAd.onClose((res) => {
        this.data.rewardedVideoAd = null;
        if (this.data._pageAlive) {
          if (res && res.isEnded) {
            this.claimPoints();
          } else {
            wx.showToast({
              title: '请完整观看广告',
              icon: 'none'
            });
          }
        }
      });

      this.safeSetData({ rewardedVideoAd });
      resolve();
    });
  },

  destroyRewardedVideoAd: function() {
    const ad = this.data.rewardedVideoAd;
    if (!ad || !ad.destroy) {
      return;
    }
    try {
      ad.destroy();
    } catch (e) {
      console.log('销毁广告组件失败:', e);
    }
    this.data.rewardedVideoAd = null;
  },

  handleClaimPoints: async function() {
    const { pointsInfo, isLoading } = this.data;

    if (!this.data.isLoggedIn) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      });
      return;
    }

    if (!pointsInfo.canWatchMore) {
      wx.showToast({
        title: '今日观看次数已用完',
        icon: 'none'
      });
      return;
    }

    if (isLoading) {
      return;
    }

    if (!this.data._pageAlive) {
      return;
    }

    try {
      await this.initRewardedVideoAd();
      const rewardedVideoAd = this.data.rewardedVideoAd;
      
      if (rewardedVideoAd && this.data._pageAlive) {
        rewardedVideoAd.show().catch(() => {
          rewardedVideoAd.load().then(() => {
            rewardedVideoAd.show();
          });
        });
      } else {
        wx.showToast({
          title: '广告加载失败',
          icon: 'none'
        });
      }
    } catch (err) {
      if (!this.data._pageAlive) {
        return;
      }
      console.error('显示激励视频广告失败:', err);
      wx.showToast({
        title: '广告加载失败',
        icon: 'none'
      });
    }
  },

  claimPoints: function() {
    if (!this.data._pageAlive) {
      return;
    }
    const userInfo = wx.getStorageSync('userInfo');
    const token = userInfo.userToken || userInfo.userId;
    if (!userInfo || !token) {
      return;
    }

    this.safeSetData({ isLoading: true });

    api.claimAdPoints(token, `wx_ad_${Date.now()}`)
      .then((res) => {
        if (!this.data._pageAlive) {
          return;
        }
        this.safeSetData({ isLoading: false });
        
        if (res.success) {
          const data = res.data;
          wx.showToast({
            title: `+${data.pointsEarned}积分`,
            icon: 'success'
          });
          
          this.safeSetData({
            'pointsInfo.balance': data.newBalance,
            'pointsInfo.todayWatched': data.todayWatched,
            'pointsInfo.canWatchMore': data.remainingTimes > 0
          });
        } else {
          wx.showToast({
            title: res.message || '领取失败',
            icon: 'none'
          });
        }
      })
      .catch((err) => {
        if (!this.data._pageAlive) {
          return;
        }
        this.safeSetData({ isLoading: false });
        console.error('领取积分失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      });
  },

  goToPointsLog: function() {
    wx.navigateTo({
      url: '/pages/points-log/points-log'
    });
  }
});

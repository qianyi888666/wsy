/**
 * @fileoverview 积分记录页面逻辑
 * @description 处理积分记录列表展示、筛选、加载更多等功能
 * @version 1.0.0
 */

const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    currentTab: 'all',
    logList: [],
    page: 1,
    limit: 20,
    isLoading: false,
    noMore: false,
    hasData: false
  },

  onLoad: function(options) {
    this.loadPointsLog();
  },

  onPullDownRefresh: function() {
    this.resetData();
    this.loadPointsLog();
    wx.stopPullDownRefresh();
  },

  onShow: function() {
    this.checkLoginStatus();
  },

  checkLoginStatus: function() {
    const isLoggedIn = wx.getStorageSync('isLoggedIn');
    if (!isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录',
        showCancel: false,
        success: () => {
          wx.switchTab({
            url: '/pages/profile/profile'
          });
        }
      });
    }
  },

  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.currentTab) {
      return;
    }

    this.setData({
      currentTab: tab
    });

    this.resetData();
    this.loadPointsLog();
  },

  resetData: function() {
    this.setData({
      logList: [],
      page: 1,
      isLoading: false,
      noMore: false,
      hasData: false
    });
  },

  loadPointsLog: function() {
    const userInfo = wx.getStorageSync('userInfo');
    const token = userInfo.userToken || userInfo.userId;
    if (!userInfo || !token) {
      return;
    }

    if (this.data.isLoading || this.data.noMore) {
      return;
    }

    this.setData({ isLoading: true });

    api.getPointsLog(token, this.data.page, this.data.limit, this.data.currentTab)
      .then((res) => {
        this.setData({ isLoading: false });
        
        if (res.success) {
          const list = res.data.list || [];
          const hasData = list.length > 0;
          
          this.setData({
            logList: this.data.page === 1 ? list : [...this.data.logList, ...list],
            hasData: hasData,
            noMore: list.length < this.data.limit,
            page: this.data.page + 1
          });
        } else {
          wx.showToast({
            title: res.message || '加载失败',
            icon: 'none'
          });
        }
      })
      .catch((err) => {
        this.setData({ isLoading: false });
        console.error('加载积分记录失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      });
  },

  loadMore: function() {
    if (!this.data.noMore && !this.data.isLoading) {
      this.loadPointsLog();
    }
  },

  goBack: function() {
    wx.navigateBack();
  }
});

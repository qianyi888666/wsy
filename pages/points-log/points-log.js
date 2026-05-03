/**
 * @fileoverview 积分记录页面逻辑
 * @description 处理积分记录列表展示、筛选、加载更多等功能
 * @version 2.0.0
 */

const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    summary: {
      balance: 0,
      totalEarned: 0,
      totalConsumed: 0
    },
    currentTab: 'all',
    startDate: '',
    endDate: '',
    sort: 'desc',
    filterOptions: ['全部', '获得', '消耗'],
    sortOptions: ['最新优先', '最早优先'],
    currentFilterName: '全部',
    currentSortName: '最新优先',
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
      currentTab: tab,
      currentFilterName: this.getFilterName(tab)
    });

    this.resetData();
    this.loadPointsLog();
  },

  getFilterName: function(filter) {
    const filterMap = {
      'all': '全部',
      'earn': '获得',
      'consume': '消耗'
    };
    return filterMap[filter] || '全部';
  },

  onStartDateChange: function(e) {
    const startDate = e.detail.value;
    if (this.data.endDate && startDate > this.data.endDate) {
      wx.showToast({
        title: '开始日期不能晚于结束日期',
        icon: 'none'
      });
      return;
    }
    this.setData({
      startDate: startDate
    });
    this.resetData();
    this.loadPointsLog();
  },

  onEndDateChange: function(e) {
    const endDate = e.detail.value;
    if (this.data.startDate && endDate < this.data.startDate) {
      wx.showToast({
        title: '结束日期不能早于开始日期',
        icon: 'none'
      });
      return;
    }
    this.setData({
      endDate: endDate
    });
    this.resetData();
    this.loadPointsLog();
  },

  onFilterChange: function(e) {
    const filters = ['all', 'earn', 'consume'];
    const filterValues = ['全部', '获得', '消耗'];
    const tab = filters[e.detail.value];
    const filterName = filterValues[e.detail.value];
    if (tab === this.data.currentTab) {
      return;
    }
    this.setData({
      currentTab: tab,
      currentFilterName: filterName
    });
    this.resetData();
    this.loadPointsLog();
  },

  onSortChange: function(e) {
    const sorts = ['desc', 'asc'];
    const sortNames = ['最新优先', '最早优先'];
    const sort = sorts[e.detail.value];
    if (sort === this.data.sort) {
      return;
    }
    this.setData({
      sort: sort,
      currentSortName: sortNames[e.detail.value]
    });
    this.resetData();
    this.loadPointsLog();
  },

  resetFilters: function() {
    this.setData({
      startDate: '',
      endDate: '',
      currentTab: 'all',
      sort: 'desc',
      currentFilterName: '全部',
      currentSortName: '最新优先'
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

    api.getPointsLog(
      token,
      this.data.page,
      this.data.limit,
      this.data.currentTab,
      this.data.startDate,
      this.data.endDate,
      this.data.sort
    ).then((res) => {
      this.setData({ isLoading: false });

      if (res.success) {
        const list = res.data.list || [];
        const summary = res.data.summary || {
          balance: 0,
          totalEarned: 0,
          totalConsumed: 0
        };
        const hasMore = res.data.hasMore !== undefined ? res.data.hasMore : (list.length >= this.data.limit);
        const hasData = list.length > 0 || this.data.page > 1;

        this.setData({
          isLoading: false,
          summary: summary,
          logList: this.data.page === 1 ? list : [...this.data.logList, ...list],
          hasData: hasData,
          noMore: !hasMore,
          page: this.data.page + 1
        });
      } else {
        wx.showToast({
          title: res.message || '加载失败',
          icon: 'none'
        });
      }
    }).catch((err) => {
      this.setData({ isLoading: false });
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
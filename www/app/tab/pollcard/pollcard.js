'use strict';

angular.module('voteit.tab.pollcard', [])

.config(function ($stateProvider) {
  $stateProvider.state('tab.tab-home-pollcard', {
    url: '/tab-home/pollcard',
    params: {poll: null},
    views: {
      'tab-home': {
        templateUrl: 'app/tab/pollcard/pollcard.html',
        controller: 'PollcardCtrl as ctrl'
      }
    }
  });
  $stateProvider.state('tab.tab-profile-pollcard', {
    url: '/tab-profile/pollcard',
    params: {poll: null},
    views: {
      'tab-profile': {
        templateUrl: 'app/tab/pollcard/pollcard.html',
        controller: 'PollcardCtrl as ctrl'
      }
    }
  });
})

.controller('PollcardCtrl', [
  '$scope',
  '$stateParams', 
function ($scope, $stateParams) {
  var self = this;
  self.poll = $stateParams.poll;
}]);
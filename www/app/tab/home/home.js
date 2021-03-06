'use strict';

angular.module('voteit.tab.home', [
  'ionic.contrib.ui.cards'
])

.config(function ($stateProvider) {
  $stateProvider.state('tab.tab-home-home', {
    url: '/tab-home/home',
    views: {
      'tab-home': {
        templateUrl: 'app/tab/home/home.html',
        controller: 'HomeCtrl as home'
      }
    }
  });
})

.controller('HomeCtrl', [
  '$scope', 
  '$ionicModal',
  'Polls',
  'User', 
  '$ionicLoading',
  '$cordovaCamera',
  '$cordovaFile',
  '$cordovaFileTransfer',
  '$cordovaDialogs',
function ($scope, $ionicModal, Polls, User, $ionicLoading, $cordovaCamera, $cordovaFile, $cordovaFileTransfer, $cordovaDialogs) {

  var self = this;

  // render piegraph when entering home view
  $scope.$on('$ionicView.afterEnter', function () {
    $scope.$broadcast('vocard:updatePie');
  });

  var showLoading = function () {
    $ionicLoading.show({
      template: '<ion-spinner></ion-spinner>',
      duration: 5000
    });
  };
  var hideLoading = function () {
    $ionicLoading.hide();
  };

  var uploadImgToS3 = function (imageUri) {
    var user = User.getMe(),
        s3Info = User.getS3Info(),
        fileName = user.id + '/' + Date.now() + '.jpeg',
        pictureUrl = s3Info.uploadUrl + fileName,
        options = {};

    options.params = {
      'key': fileName,
      'AWSAccessKeyId': s3Info.accessKey,
      'acl': 'public-read',
      'policy': s3Info.policy,
      'signature': s3Info.signature,
      'Content-Type': 'image/jpeg'
    };
    options.chunkedMode = false;
    options.headers = { 'Connection': 'close' };

    return $cordovaFileTransfer.upload(s3Info.uploadUrl, imageUri, options)
      .then(function () { return pictureUrl; });
  };

  var setPicture = function (url) {
    if (!self.newPoll.answer1.picture) {
      self.newPoll.answer1.picture = url;
    } else {
      self.newPoll.answer2.picture = url;
    }
  };

  // refresh button
  self.refresh = function () {
    $scope.$broadcast('HomeCtrl.refresh');
  };
  //===========================================================================
  //                Create Poll Modal
  //===========================================================================

  self.newPoll = { 
    question: '',
    answer1: { text: '', picture: '' },
    answer2: { text: '', picture: '' }
  };
  self.createPollModal = '';

  $ionicModal
  .fromTemplateUrl('app/tab/home/create-poll-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function (modal) {
    self.createPollModal = modal;
  });

  self.openModal = function () {
    self.newPoll.question = '';
    self.newPoll.answer1.text = '';
    self.newPoll.answer2.text = '';
    self.newPoll.answer1.picture = '';
    self.newPoll.answer2.picture = '';

    self.resetImgSearch();

    self.createPollModal.show();
  };

  self.closeModal = function() {
    self.createPollModal.hide();
  };

  self.getPhoto = function (sourceType) {
    // sourcetype PHOTOLIBRARY or CAMERA 
    var options = {
      quality: 30,
      destinationType: window.Camera.DestinationType.FILE_URI,
      sourceType: window.Camera.PictureSourceType[sourceType],
      allowEdit: true,
      encodingType: window.Camera.EncodingType.JPEG,
      targetWidth: 600,
      targetHeight: 600,
      popoverOptions: window.CameraPopoverOptions,
      saveToPhotoAlbum: false
    };
    $cordovaCamera.getPicture(options)
      .then(function (imgUri) { showLoading(); return imgUri; })
      .then(uploadImgToS3)
      .then(setPicture)
      .catch(function () {})
      .finally(function () {
        hideLoading();
      });
  };

  self.cancelPicture = function (picNum) {
    if (picNum === 1) {
      self.newPoll.answer1.picture = self.newPoll.answer2.picture;
      self.newPoll.answer2.picture = '';
    } else if (picNum === 2) {
      self.newPoll.answer2.picture = ''; 
    }
  };

  self.handleReturnKey = function ($event, inputType) {
    if ($event.which === 13) {
      switch (inputType) {
      case 'question':
        self.questionDone = true;
        break;
      case 'answer1':
        self.answer1Done = true;
        break;
      case 'answer2':
        self.answer2Done = true;
        break;
      default:
        // Do nothing
      }
    }
  };

  self.createPoll = function () {
    if (self.creatingPoll) {
      return;
    }
    if (!self.newPoll.question) {
      return $cordovaDialogs
              .alert('Please enter a question', 'Empty question', 'OK');
    }

    self.creatingPoll = true;
    showLoading();
    Polls.create(self.newPoll).then(function () {
      self.closeModal();
      $scope.$broadcast('HomeCtrl.cardCreated');
    }).catch(function () {
    }).finally(function () {
      self.creatingPoll = false;
      hideLoading(); 
    });
  };

  //===========================================================================
  //                Img Search Modal
  //===========================================================================

  self.imgSearchModal = '';
  self.imgSearchQuery = '';
  self.imgSearchResults = [];

  $ionicModal
  .fromTemplateUrl('app/tab/home/img-search-modal.html', {
    scope: $scope,
    animation: 'slide-in-up'
  }).then(function (modal) {
    self.imgSearchModal = modal;
  });

  self.openImgSearchModal = function () {
    self.imgSearchModal.show();
  };

  self.closeImagSeach = function () {
    self.imgSearchModal.hide();
  };

  self.searchImg = function () {
    if (window.cordova && window.cordova.plugins) {
      window.cordova.plugins.Keyboard.close();
    }
    showLoading();
    User.searchImg(encodeURIComponent(self.imgSearchQuery)).then(function (r) {
      self.imgSearchResults = r;
    }).catch(function () {
    }).finally(function () {
      hideLoading();
    });
  };

  self.resetImgSearch = function () {
    self.imgSearchQuery = '';
    self.imgSearchResults = [];
  };

  self.selectImg = function (img) {
    var cordova = window.cordova;
    var url = img.MediaUrl,
        targetPath = cordova.file.dataDirectory + 'downloadedSearchImg',
        trustHosts = true,
        options = {};

    self.imgSearchModal.hide();
    self.resetImgSearch();
    showLoading();

    $cordovaFileTransfer
      .download(url, targetPath, options, trustHosts)
      .then(function (result) {
        var imageUri = result.nativeURL;
        return imageUri;
      }).then(uploadImgToS3)
      .then(setPicture)
      .catch(function () {})
      .finally(function () {
        hideLoading();
      });
  };

}])

.controller('CardsCtrl', [
  '$scope',
  '$ionicSwipeCardDelegate',
  'Polls',
  '$timeout',
function ($scope, $ionicSwipeCardDelegate, Polls, $timeout) {

  var self = this;

  var init = function (refresh) {
    self.polls = [];
    self.msgCards = [];
    self.loading = true;

    Polls.getNextPolls(refresh).then(function () {
      self.addCard();
      self.loading = false;
    });
  };

  self.cardSwiped = function() {
    $timeout(function () {
      self.addCard();
    }, 300);
  };

  self.cardDestroyed = function(index, isMsgCard) {
    if (isMsgCard) {
      self.msgCards.splice(index, 1); 
    } else {
      self.polls.splice(index, 1);
    }
  };

  self.addCard = function () {
    var poll = Polls.getNextPoll();
    if (!poll) {
      return self.msgCards.push({
        message: '<span><img src="img/minimon.png" width="80px" height="80px"><br>Boo!<br>You reviewed all polls.<br>It\'s your time to make one!</span>'
      });
    }
    self.polls.push(poll);
    // update piechart for the case when added poll is already voted
    $timeout(function () {
      $scope.$broadcast('vocard:updatePie');
    });
  };

  $scope.$on('HomeCtrl.cardCreated', function () {
    self.msgCards = [];
    self.polls = [];
    self.addCard();
  });
  $scope.$on('HomeCtrl.refresh', function () {
    init(true);
  });

  init();
}])

.directive('adjustMargin', [
function () {
  return {
    restrict: 'A',
    link: function ($scope, $element) {
      var elem = $element[0];
      if(!ionic.Platform.isIOS()) {
        $scope.$on('native.keyboardhide', function () {
          elem.style.marginTop = '';
        });
        $scope.$on('native.keyboardshow', function () {
          elem.style.marginTop = '-43px';
        });
      }
    }
  };
}]);

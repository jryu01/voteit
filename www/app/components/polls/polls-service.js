'use strict';
/* jshint quotmark: false */

angular.module('voteit.polls', [])


.factory('Polls', ['Restangular', function (Restangular) {

  var that = {
    queue: []
  };
  var Polls = Restangular.all('polls');

  that.getNextPolls = function (exclude) {
    var query = {
      random: true
    };
    if (exclude) {
      query.exclude = exclude;
    }
    return Polls.getList(query).then(function (polls) {
      that.queue = that.queue.concat(polls);
    });
  };

  that.getNextPoll = function () {
    if (that.queue.length <= 3) {
      that.getNextPolls(that.lastVotedPollId);
    }
    return that.queue.shift();
  };

  that.create = function (poll) {
    return Polls.post(poll).then(function (poll) {
      that.queue.unshift(poll);
      return poll;
    });
  };

  that.vote = function (poll, subjectId) {
    that.lastVotedPollId = poll.id;
    // remove voted poll from the queue if one exists
    that.queue.forEach(function (value, index, array) {
      if (value.id === poll.id) {
        array.splice(index, 1);
      }
    });
    return poll.post('votes', { subjectId: subjectId });
  };

  return that;
}]);
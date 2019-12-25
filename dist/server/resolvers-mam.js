"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.resolversMam = void 0;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _fs = _interopRequireDefault(require("fs"));

var _arango = _interopRequireDefault(require("./arango"));

var _arangoCollection = require("./arango-collection");

var _path = _interopRequireDefault(require("path"));

// Query
function info() {
  var pkg = JSON.parse(_fs["default"].readFileSync(_path["default"].resolve(__dirname, '..', '..', 'package.json')));
  return {
    version: pkg.version
  };
}

function selectionToString(selection) {
  return selection.filter(function (x) {
    return x.name !== '__typename';
  }).map(function (field) {
    var fieldSelection = selectionToString(field.selection);
    return "".concat(field.name).concat(fieldSelection !== '' ? " { ".concat(fieldSelection, " }") : '');
  }).join(' ');
}

function stat(_parent, _args, context) {
  var subscriptionToStat = function subscriptionToStat(subscription) {
    return {
      filter: JSON.stringify(subscription.filter),
      selection: selectionToString(subscription.selection),
      queueSize: subscription.getQueueSize(),
      eventCount: subscription.eventCount
    };
  };

  var db = context.db;
  return {
    collections: db.collections.map(function (collection) {
      return {
        name: collection.name,
        subscriptionCount: collection.subscriptions.items.size,
        waitForCount: collection.waitFor.items.size,
        maxQueueSize: collection.maxQueueSize,
        subscriptions: (0, _toConsumableArray2["default"])(collection.subscriptions.values()).map(subscriptionToStat)
      };
    })
  };
}

function getChangeLog(_parent, args, context) {
  return context.db.changeLog.get(args.id);
}

function getCollections(_x, _x2, _x3) {
  return _getCollections.apply(this, arguments);
} // Mutation


function _getCollections() {
  _getCollections = (0, _asyncToGenerator2["default"])(
  /*#__PURE__*/
  _regenerator["default"].mark(function _callee(_parent, _args, context) {
    var db, collections, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, _collection, _indexes, _dbCollection, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, _index;

    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            db = context.db;
            collections = [];
            _iteratorNormalCompletion = true;
            _didIteratorError = false;
            _iteratorError = undefined;
            _context.prev = 5;
            _iterator = db.collections[Symbol.iterator]();

          case 7:
            if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
              _context.next = 50;
              break;
            }

            _collection = _step.value;
            _indexes = [];
            _dbCollection = _collection.dbCollection();
            _iteratorNormalCompletion2 = true;
            _didIteratorError2 = false;
            _iteratorError2 = undefined;
            _context.prev = 14;
            _context.next = 17;
            return _dbCollection.indexes();

          case 17:
            _context.t0 = Symbol.iterator;
            _iterator2 = _context.sent[_context.t0]();

          case 19:
            if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
              _context.next = 25;
              break;
            }

            _index = _step2.value;

            _indexes.push(_index.fields.join(', '));

          case 22:
            _iteratorNormalCompletion2 = true;
            _context.next = 19;
            break;

          case 25:
            _context.next = 31;
            break;

          case 27:
            _context.prev = 27;
            _context.t1 = _context["catch"](14);
            _didIteratorError2 = true;
            _iteratorError2 = _context.t1;

          case 31:
            _context.prev = 31;
            _context.prev = 32;

            if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
              _iterator2["return"]();
            }

          case 34:
            _context.prev = 34;

            if (!_didIteratorError2) {
              _context.next = 37;
              break;
            }

            throw _iteratorError2;

          case 37:
            return _context.finish(34);

          case 38:
            return _context.finish(31);

          case 39:
            _context.t2 = collections;
            _context.t3 = _collection.name;
            _context.next = 43;
            return _dbCollection.count();

          case 43:
            _context.t4 = _context.sent.count;
            _context.t5 = _indexes;
            _context.t6 = {
              collection: _context.t3,
              count: _context.t4,
              indexes: _context.t5
            };

            _context.t2.push.call(_context.t2, _context.t6);

          case 47:
            _iteratorNormalCompletion = true;
            _context.next = 7;
            break;

          case 50:
            _context.next = 56;
            break;

          case 52:
            _context.prev = 52;
            _context.t7 = _context["catch"](5);
            _didIteratorError = true;
            _iteratorError = _context.t7;

          case 56:
            _context.prev = 56;
            _context.prev = 57;

            if (!_iteratorNormalCompletion && _iterator["return"] != null) {
              _iterator["return"]();
            }

          case 59:
            _context.prev = 59;

            if (!_didIteratorError) {
              _context.next = 62;
              break;
            }

            throw _iteratorError;

          case 62:
            return _context.finish(59);

          case 63:
            return _context.finish(56);

          case 64:
            return _context.abrupt("return", collections);

          case 65:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, null, [[5, 52, 56, 64], [14, 27, 31, 39], [32,, 34, 38], [57,, 59, 63]]);
  }));
  return _getCollections.apply(this, arguments);
}

function setChangeLog(_parent, args, context) {
  if (args.op === 'CLEAR') {
    context.db.changeLog.clear();
  } else if (args.op === 'ON') {
    context.db.changeLog.enabled = true;
  } else if (args.op === 'OFF') {
    context.db.changeLog.enabled = false;
  }

  return 1;
}

var resolversMam = {
  Query: {
    info: info,
    getChangeLog: getChangeLog,
    getCollections: getCollections,
    stat: stat
  },
  Mutation: {
    setChangeLog: setChangeLog
  }
};
exports.resolversMam = resolversMam;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NlcnZlci9yZXNvbHZlcnMtbWFtLmpzIl0sIm5hbWVzIjpbImluZm8iLCJwa2ciLCJKU09OIiwicGFyc2UiLCJmcyIsInJlYWRGaWxlU3luYyIsInBhdGgiLCJyZXNvbHZlIiwiX19kaXJuYW1lIiwidmVyc2lvbiIsInNlbGVjdGlvblRvU3RyaW5nIiwic2VsZWN0aW9uIiwiZmlsdGVyIiwieCIsIm5hbWUiLCJtYXAiLCJmaWVsZCIsImZpZWxkU2VsZWN0aW9uIiwiam9pbiIsInN0YXQiLCJfcGFyZW50IiwiX2FyZ3MiLCJjb250ZXh0Iiwic3Vic2NyaXB0aW9uVG9TdGF0Iiwic3Vic2NyaXB0aW9uIiwic3RyaW5naWZ5IiwicXVldWVTaXplIiwiZ2V0UXVldWVTaXplIiwiZXZlbnRDb3VudCIsImRiIiwiY29sbGVjdGlvbnMiLCJjb2xsZWN0aW9uIiwic3Vic2NyaXB0aW9uQ291bnQiLCJzdWJzY3JpcHRpb25zIiwiaXRlbXMiLCJzaXplIiwid2FpdEZvckNvdW50Iiwid2FpdEZvciIsIm1heFF1ZXVlU2l6ZSIsInZhbHVlcyIsImdldENoYW5nZUxvZyIsImFyZ3MiLCJjaGFuZ2VMb2ciLCJnZXQiLCJpZCIsImdldENvbGxlY3Rpb25zIiwiaW5kZXhlcyIsImRiQ29sbGVjdGlvbiIsImluZGV4IiwicHVzaCIsImZpZWxkcyIsImNvdW50Iiwic2V0Q2hhbmdlTG9nIiwib3AiLCJjbGVhciIsImVuYWJsZWQiLCJyZXNvbHZlcnNNYW0iLCJRdWVyeSIsIk11dGF0aW9uIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUFFQTs7QUFDQTs7QUFFQTs7QUFFQTs7QUFxQ0E7QUFFQSxTQUFTQSxJQUFULEdBQXNCO0FBQ2xCLE1BQU1DLEdBQUcsR0FBR0MsSUFBSSxDQUFDQyxLQUFMLENBQVlDLGVBQUdDLFlBQUgsQ0FBZ0JDLGlCQUFLQyxPQUFMLENBQWFDLFNBQWIsRUFBd0IsSUFBeEIsRUFBOEIsSUFBOUIsRUFBb0MsY0FBcEMsQ0FBaEIsQ0FB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YixJQUFJLENBQUNZLEVBQUwsS0FBWSxJQUFoQixFQUFzQjtBQUN6Qi9CLElBQUFBLE9BQU8sQ0FBQ08sRUFBUixDQUFXYSxTQUFYLENBQXFCYSxPQUFyQixHQUErQixJQUEvQjtBQUNILEdBRk0sTUFFQSxJQUFJZCxJQUFJLENBQUNZLEVBQUwsS0FBWSxLQUFoQixFQUF1QjtBQUMxQi9CLElBQUFBLE9BQU8sQ0FBQ08sRUFBUixDQUFXYSxTQUFYLENBQXFCYSxPQUFyQixHQUErQixLQUEvQjtBQUNIOztBQUNELFNBQU8sQ0FBUDtBQUNIOztBQUVNLElBQU1DLFlBQVksR0FBRztBQUN4QkMsRUFBQUEsS0FBSyxFQUFFO0FBQ0h6RCxJQUFBQSxJQUFJLEVBQUpBLElBREc7QUFFSHdDLElBQUFBLFlBQVksRUFBWkEsWUFGRztBQUdISyxJQUFBQSxjQUFjLEVBQWRBLGNBSEc7QUFJSDFCLElBQUFBLElBQUksRUFBSkE7QUFKRyxHQURpQjtBQU94QnVDLEVBQUFBLFFBQVEsRUFBRTtBQUNOTixJQUFBQSxZQUFZLEVBQVpBO0FBRE07QUFQYyxDQUFyQiIsInNvdXJjZXNDb250ZW50IjpbIi8vIEBmbG93XG5cbmltcG9ydCBmcyBmcm9tIFwiZnNcIjtcbmltcG9ydCBBcmFuZ28gZnJvbSBcIi4vYXJhbmdvXCI7XG5pbXBvcnQgdHlwZSB7IEZpZWxkU2VsZWN0aW9uIH0gZnJvbSBcIi4vYXJhbmdvLWNvbGxlY3Rpb25cIjtcbmltcG9ydCB7IENvbGxlY3Rpb24sIENvbGxlY3Rpb25TdWJzY3JpcHRpb24gfSBmcm9tIFwiLi9hcmFuZ28tY29sbGVjdGlvblwiO1xuaW1wb3J0IHR5cGUgeyBRQ29uZmlnIH0gZnJvbSBcIi4vY29uZmlnXCI7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxudHlwZSBDb250ZXh0ID0ge1xuICAgIGRiOiBBcmFuZ28sXG4gICAgY29uZmlnOiBRQ29uZmlnLFxuICAgIHNoYXJlZDogTWFwPHN0cmluZywgYW55Pixcbn1cblxudHlwZSBJbmZvID0ge1xuICAgIHZlcnNpb246IHN0cmluZyxcbn1cblxudHlwZSBTdWJzY3JpcHRpb25TdGF0ID0ge1xuICAgIGZpbHRlcjogc3RyaW5nLFxuICAgIHNlbGVjdGlvbjogc3RyaW5nLFxuICAgIHF1ZXVlU2l6ZTogbnVtYmVyLFxuICAgIGV2ZW50Q291bnQ6IG51bWJlcixcbn1cblxudHlwZSBDb2xsZWN0aW9uU3RhdCA9IHtcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgc3Vic2NyaXB0aW9uQ291bnQ6IG51bWJlcixcbiAgICB3YWl0Rm9yQ291bnQ6IG51bWJlcixcbiAgICBtYXhRdWV1ZVNpemU6IG51bWJlcixcbiAgICBzdWJzY3JpcHRpb25zOiBTdWJzY3JpcHRpb25TdGF0W10sXG59XG5cbnR5cGUgU3RhdCA9IHtcbiAgICBjb2xsZWN0aW9uczogQ29sbGVjdGlvblN0YXRbXVxufVxuXG50eXBlIENvbGxlY3Rpb25TdW1tYXJ5ID0ge1xuICAgIGNvbGxlY3Rpb246IHN0cmluZyxcbiAgICBjb3VudDogbnVtYmVyLFxuICAgIGluZGV4ZXM6IHN0cmluZ1tdLFxufVxuXG4vLyBRdWVyeVxuXG5mdW5jdGlvbiBpbmZvKCk6IEluZm8ge1xuICAgIGNvbnN0IHBrZyA9IEpTT04ucGFyc2UoKGZzLnJlYWRGaWxlU3luYyhwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnLi4nLCAncGFja2FnZS5qc29uJykpOiBhbnkpKTtcbiAgICByZXR1cm4ge1xuICAgICAgICB2ZXJzaW9uOiBwa2cudmVyc2lvbixcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBzZWxlY3Rpb25Ub1N0cmluZyhzZWxlY3Rpb246IEZpZWxkU2VsZWN0aW9uW10pOiBzdHJpbmcge1xuICAgIHJldHVybiBzZWxlY3Rpb25cbiAgICAgICAgLmZpbHRlcih4ID0+IHgubmFtZSAhPT0gJ19fdHlwZW5hbWUnKVxuICAgICAgICAubWFwKChmaWVsZDogRmllbGRTZWxlY3Rpb24pID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkU2VsZWN0aW9uID0gc2VsZWN0aW9uVG9TdHJpbmcoZmllbGQuc2VsZWN0aW9uKTtcbiAgICAgICAgICAgIHJldHVybiBgJHtmaWVsZC5uYW1lfSR7ZmllbGRTZWxlY3Rpb24gIT09ICcnID8gYCB7ICR7ZmllbGRTZWxlY3Rpb259IH1gIDogJyd9YDtcbiAgICAgICAgfSkuam9pbignICcpO1xufVxuXG5mdW5jdGlvbiBzdGF0KF9wYXJlbnQ6IGFueSwgX2FyZ3M6IGFueSwgY29udGV4dDogQ29udGV4dCk6IFN0YXQge1xuICAgIGNvbnN0IHN1YnNjcmlwdGlvblRvU3RhdCA9IChzdWJzY3JpcHRpb246IENvbGxlY3Rpb25TdWJzY3JpcHRpb24pOiBTdWJzY3JpcHRpb25TdGF0ID0+IHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIGZpbHRlcjogSlNPTi5zdHJpbmdpZnkoc3Vic2NyaXB0aW9uLmZpbHRlciksXG4gICAgICAgICAgICBzZWxlY3Rpb246IHNlbGVjdGlvblRvU3RyaW5nKHN1YnNjcmlwdGlvbi5zZWxlY3Rpb24pLFxuICAgICAgICAgICAgcXVldWVTaXplOiBzdWJzY3JpcHRpb24uZ2V0UXVldWVTaXplKCksXG4gICAgICAgICAgICBldmVudENvdW50OiBzdWJzY3JpcHRpb24uZXZlbnRDb3VudCxcbiAgICAgICAgfTtcbiAgICB9O1xuICAgIGNvbnN0IGRiOiBBcmFuZ28gPSBjb250ZXh0LmRiO1xuICAgIHJldHVybiB7XG4gICAgICAgIGNvbGxlY3Rpb25zOiBkYi5jb2xsZWN0aW9ucy5tYXAoKGNvbGxlY3Rpb246IENvbGxlY3Rpb24pID0+IHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgbmFtZTogY29sbGVjdGlvbi5uYW1lLFxuICAgICAgICAgICAgICAgIHN1YnNjcmlwdGlvbkNvdW50OiBjb2xsZWN0aW9uLnN1YnNjcmlwdGlvbnMuaXRlbXMuc2l6ZSxcbiAgICAgICAgICAgICAgICB3YWl0Rm9yQ291bnQ6IGNvbGxlY3Rpb24ud2FpdEZvci5pdGVtcy5zaXplLFxuICAgICAgICAgICAgICAgIG1heFF1ZXVlU2l6ZTogY29sbGVjdGlvbi5tYXhRdWV1ZVNpemUsXG4gICAgICAgICAgICAgICAgc3Vic2NyaXB0aW9uczogWy4uLmNvbGxlY3Rpb24uc3Vic2NyaXB0aW9ucy52YWx1ZXMoKV0ubWFwKHN1YnNjcmlwdGlvblRvU3RhdCksXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfVxufVxuXG5mdW5jdGlvbiBnZXRDaGFuZ2VMb2coX3BhcmVudDogYW55LCBhcmdzOiB7IGlkOiBzdHJpbmcgfSwgY29udGV4dDogQ29udGV4dCk6IG51bWJlcltdIHtcbiAgICByZXR1cm4gY29udGV4dC5kYi5jaGFuZ2VMb2cuZ2V0KGFyZ3MuaWQpO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRDb2xsZWN0aW9ucyhfcGFyZW50OiBhbnksIF9hcmdzOiBhbnksIGNvbnRleHQ6IENvbnRleHQpOiBQcm9taXNlPENvbGxlY3Rpb25TdW1tYXJ5W10+IHtcbiAgICBjb25zdCBkYjogQXJhbmdvID0gY29udGV4dC5kYjtcbiAgICBjb25zdCBjb2xsZWN0aW9uczogQ29sbGVjdGlvblN1bW1hcnlbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY29sbGVjdGlvbiBvZiBkYi5jb2xsZWN0aW9ucykge1xuICAgICAgICBjb25zdCBpbmRleGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgICAgICBjb25zdCBkYkNvbGxlY3Rpb24gPSBjb2xsZWN0aW9uLmRiQ29sbGVjdGlvbigpO1xuICAgICAgICBmb3IgKGNvbnN0IGluZGV4IG9mIGF3YWl0IGRiQ29sbGVjdGlvbi5pbmRleGVzKCkpIHtcbiAgICAgICAgICAgIGluZGV4ZXMucHVzaChpbmRleC5maWVsZHMuam9pbignLCAnKSk7XG4gICAgICAgIH1cbiAgICAgICAgY29sbGVjdGlvbnMucHVzaCh7XG4gICAgICAgICAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uLm5hbWUsXG4gICAgICAgICAgICBjb3VudDogKGF3YWl0IGRiQ29sbGVjdGlvbi5jb3VudCgpKS5jb3VudCxcbiAgICAgICAgICAgIGluZGV4ZXMsXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gY29sbGVjdGlvbnM7XG59XG5cbi8vIE11dGF0aW9uXG5cbmZ1bmN0aW9uIHNldENoYW5nZUxvZyhfcGFyZW50OiBhbnksIGFyZ3M6IHsgb3A6IHN0cmluZyB9LCBjb250ZXh0OiBDb250ZXh0KTogbnVtYmVyIHtcbiAgICBpZiAoYXJncy5vcCA9PT0gJ0NMRUFSJykge1xuICAgICAgICBjb250ZXh0LmRiLmNoYW5nZUxvZy5jbGVhcigpO1xuICAgIH0gZWxzZSBpZiAoYXJncy5vcCA9PT0gJ09OJykge1xuICAgICAgICBjb250ZXh0LmRiLmNoYW5nZUxvZy5lbmFibGVkID0gdHJ1ZTtcbiAgICB9IGVsc2UgaWYgKGFyZ3Mub3AgPT09ICdPRkYnKSB7XG4gICAgICAgIGNvbnRleHQuZGIuY2hhbmdlTG9nLmVuYWJsZWQgPSBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIDE7XG59XG5cbmV4cG9ydCBjb25zdCByZXNvbHZlcnNNYW0gPSB7XG4gICAgUXVlcnk6IHtcbiAgICAgICAgaW5mbyxcbiAgICAgICAgZ2V0Q2hhbmdlTG9nLFxuICAgICAgICBnZXRDb2xsZWN0aW9ucyxcbiAgICAgICAgc3RhdFxuICAgIH0sXG4gICAgTXV0YXRpb246IHtcbiAgICAgICAgc2V0Q2hhbmdlTG9nLFxuICAgIH0sXG59O1xuIl19
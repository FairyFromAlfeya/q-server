"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isFastQuery = isFastQuery;

var _dbTypes = require("./db-types");

function setIs1(s, a) {
  return s.size === 1 && s.has(a);
}

function setIs2(s, a, b) {
  return s.size === 2 && s.has(a) && s.has(b);
}

function canUseIndexedRange(ops) {
  return setIs1(ops, '==') || setIs1(ops, '!=') || setIs1(ops, '>') || setIs2(ops, '>', '<') || setIs2(ops, '>', '<=') || setIs1(ops, '>=') || setIs2(ops, '>=', '<') || setIs2(ops, '>=', '<=') || setIs1(ops, '<') || setIs1(ops, '<=');
}

function canUseConditionsForIndexedRange(fields) {
  for (const explanation of fields.values()) {
    if (!canUseIndexedRange(explanation.operations)) {
      return false;
    }
  }

  return true;
}

function fieldsCanUseIndex(fields, index) {
  if (fields.size > index.fields.length) {
    return false;
  }

  for (let i = 0; i < fields.size; i += 1) {
    if (!fields.has(index.fields[i])) {
      return false;
    }
  }

  return true;
}

function getUsedIndexes(fields, collection) {
  const indexes = collection.indexes.filter(x => fieldsCanUseIndex(fields, x));
  return indexes.length > 0 ? indexes : null;
}

function orderByCanUseIndex(orderBy, fields, index) {
  if (orderBy.length === 0) {
    return true;
  }

  let iOrderBy = 0;

  for (let iIndex = 0; iIndex < index.fields.length; iIndex += 1) {
    const indexField = index.fields[iIndex];

    if (indexField === orderBy[iOrderBy].path) {
      iOrderBy += 1;

      if (iOrderBy >= orderBy.length) {
        return true;
      }
    } else {
      if (iOrderBy > 0) {
        return false;
      }

      const field = fields.get(indexField);

      if (!field) {
        return false;
      }

      if (!setIs1(field.operations, '==')) {
        return false;
      }
    }
  }

  return true;
}

function orderByCanUseAllIndexes(orderBy, fields, indexes) {
  for (let i = 0; i < indexes.length; i += 1) {
    if (!orderByCanUseIndex(orderBy, fields, indexes[i])) {
      return false;
    }
  }

  return indexes.length > 0;
}

function orderByCanUseAnyIndex(orderBy, fields, indexes) {
  for (let i = 0; i < indexes.length; i += 1) {
    if (orderByCanUseIndex(orderBy, fields, indexes[i])) {
      return true;
    }
  }

  return false;
}

function hasKeyEq(fields) {
  const key = fields.get('_key');
  return !!(key && setIs1(key.operations, '=='));
}

function logSlowReason(message, log, filter, orderBy, fields, collection, selectedIndexes) {
  const logFields = [];

  for (const [name, explanation] of fields.entries()) {
    logFields.push(`${name} ${Array.from(explanation.operations).join(' AND ')}`);
  }

  log.debug(message, {
    collection: collection.name,
    filter,
    orderBy: (0, _dbTypes.orderByToString)(orderBy),
    fields: logFields,
    ...(selectedIndexes ? {
      selectedIndexes: selectedIndexes.map(_dbTypes.indexToString)
    } : {}),
    availableIndexes: collection.indexes.map(_dbTypes.indexToString)
  });
}

function isFastQueryOrOperand(collection, type, filter, orderBy, log) {
  const params = new _dbTypes.QParams({
    explain: true
  });
  type.filterCondition(params, '', filter);

  if (!params.explanation) {
    return false;
  }

  const fields = new Map();

  for (const [field, explanation] of params.explanation.fields) {
    if (field !== 'status') {
      fields.set(field, explanation);
    }
  }

  if (hasKeyEq(fields)) {
    return true;
  }

  if (!canUseConditionsForIndexedRange(fields)) {
    if (log) {
      logSlowReason('Filter operations can\'t be used in ranged queries', log, filter, orderBy, fields, collection);
    }

    return false;
  }

  const indexes = getUsedIndexes(fields, collection);

  if (!indexes) {
    if (log) {
      logSlowReason('Available indexes can\'t be used for filter fields', log, filter, orderBy, fields, collection);
    }

    return false;
  }

  if (orderBy.length > 0) {
    if (fields.size === 0) {
      if (!orderByCanUseAnyIndex(orderBy, fields, indexes)) {
        if (log) {
          logSlowReason('Order by can\'t use any selected index', log, filter, orderBy, fields, collection, indexes);
        }

        return false;
      }
    } else {
      if (!orderByCanUseAllIndexes(orderBy, fields, indexes)) {
        if (log) {
          logSlowReason('Order by can\'t use all selected indexes', log, filter, orderBy, fields, collection, indexes);
        }

        return false;
      }
    }
  }

  return true;
}

function isFastQuery(collection, type, filter, orderBy, log) {
  const orOperands = (0, _dbTypes.splitOr)(filter);

  for (let i = 0; i < orOperands.length; i += 1) {
    if (!isFastQueryOrOperand(collection, type, orOperands[i], orderBy, log)) {
      return false;
    }
  }

  return true;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NlcnZlci9zbG93LWRldGVjdG9yLmpzIl0sIm5hbWVzIjpbInNldElzMSIsInMiLCJhIiwic2l6ZSIsImhhcyIsInNldElzMiIsImIiLCJjYW5Vc2VJbmRleGVkUmFuZ2UiLCJvcHMiLCJjYW5Vc2VDb25kaXRpb25zRm9ySW5kZXhlZFJhbmdlIiwiZmllbGRzIiwiZXhwbGFuYXRpb24iLCJ2YWx1ZXMiLCJvcGVyYXRpb25zIiwiZmllbGRzQ2FuVXNlSW5kZXgiLCJpbmRleCIsImxlbmd0aCIsImkiLCJnZXRVc2VkSW5kZXhlcyIsImNvbGxlY3Rpb24iLCJpbmRleGVzIiwiZmlsdGVyIiwieCIsIm9yZGVyQnlDYW5Vc2VJbmRleCIsIm9yZGVyQnkiLCJpT3JkZXJCeSIsImlJbmRleCIsImluZGV4RmllbGQiLCJwYXRoIiwiZmllbGQiLCJnZXQiLCJvcmRlckJ5Q2FuVXNlQWxsSW5kZXhlcyIsIm9yZGVyQnlDYW5Vc2VBbnlJbmRleCIsImhhc0tleUVxIiwia2V5IiwibG9nU2xvd1JlYXNvbiIsIm1lc3NhZ2UiLCJsb2ciLCJzZWxlY3RlZEluZGV4ZXMiLCJsb2dGaWVsZHMiLCJuYW1lIiwiZW50cmllcyIsInB1c2giLCJBcnJheSIsImZyb20iLCJqb2luIiwiZGVidWciLCJtYXAiLCJpbmRleFRvU3RyaW5nIiwiYXZhaWxhYmxlSW5kZXhlcyIsImlzRmFzdFF1ZXJ5T3JPcGVyYW5kIiwidHlwZSIsInBhcmFtcyIsIlFQYXJhbXMiLCJleHBsYWluIiwiZmlsdGVyQ29uZGl0aW9uIiwiTWFwIiwic2V0IiwiaXNGYXN0UXVlcnkiLCJvck9wZXJhbmRzIl0sIm1hcHBpbmdzIjoiOzs7Ozs7O0FBSUE7O0FBSUEsU0FBU0EsTUFBVCxDQUFnQkMsQ0FBaEIsRUFBZ0NDLENBQWhDLEVBQW9EO0FBQ2hELFNBQU9ELENBQUMsQ0FBQ0UsSUFBRixLQUFXLENBQVgsSUFBZ0JGLENBQUMsQ0FBQ0csR0FBRixDQUFNRixDQUFOLENBQXZCO0FBQ0g7O0FBRUQsU0FBU0csTUFBVCxDQUFnQkosQ0FBaEIsRUFBZ0NDLENBQWhDLEVBQTJDSSxDQUEzQyxFQUErRDtBQUMzRCxTQUFPTCxDQUFDLENBQUNFLElBQUYsS0FBVyxDQUFYLElBQWdCRixDQUFDLENBQUNHLEdBQUYsQ0FBTUYsQ0FBTixDQUFoQixJQUE0QkQsQ0FBQyxDQUFDRyxHQUFGLENBQU1FLENBQU4sQ0FBbkM7QUFDSDs7QUFFRCxTQUFTQyxrQkFBVCxDQUE0QkMsR0FBNUIsRUFBdUQ7QUFDbkQsU0FBT1IsTUFBTSxDQUFDUSxHQUFELEVBQU0sSUFBTixDQUFOLElBQ0FSLE1BQU0sQ0FBQ1EsR0FBRCxFQUFNLElBQU4sQ0FETixJQUVBUixNQUFNLENBQUNRLEdBQUQsRUFBTSxHQUFOLENBRk4sSUFHQUgsTUFBTSxDQUFDRyxHQUFELEVBQU0sR0FBTixFQUFXLEdBQVgsQ0FITixJQUlBSCxNQUFNLENBQUNHLEdBQUQsRUFBTSxHQUFOLEVBQVcsSUFBWCxDQUpOLElBS0FSLE1BQU0sQ0FBQ1EsR0FBRCxFQUFNLElBQU4sQ0FMTixJQU1BSCxNQUFNLENBQUNHLEdBQUQsRUFBTSxJQUFOLEVBQVksR0FBWixDQU5OLElBT0FILE1BQU0sQ0FBQ0csR0FBRCxFQUFNLElBQU4sRUFBWSxJQUFaLENBUE4sSUFRQVIsTUFBTSxDQUFDUSxHQUFELEVBQU0sR0FBTixDQVJOLElBU0FSLE1BQU0sQ0FBQ1EsR0FBRCxFQUFNLElBQU4sQ0FUYjtBQVVIOztBQUVELFNBQVNDLCtCQUFULENBQXlDQyxNQUF6QyxFQUEwRjtBQUN0RixPQUFLLE1BQU1DLFdBQVgsSUFBMEJELE1BQU0sQ0FBQ0UsTUFBUCxFQUExQixFQUEyQztBQUN2QyxRQUFJLENBQUNMLGtCQUFrQixDQUFDSSxXQUFXLENBQUNFLFVBQWIsQ0FBdkIsRUFBaUQ7QUFDN0MsYUFBTyxLQUFQO0FBQ0g7QUFDSjs7QUFDRCxTQUFPLElBQVA7QUFDSDs7QUFFRCxTQUFTQyxpQkFBVCxDQUEyQkosTUFBM0IsRUFBbUVLLEtBQW5FLEVBQThGO0FBQzFGLE1BQUlMLE1BQU0sQ0FBQ1AsSUFBUCxHQUFjWSxLQUFLLENBQUNMLE1BQU4sQ0FBYU0sTUFBL0IsRUFBdUM7QUFDbkMsV0FBTyxLQUFQO0FBQ0g7O0FBQ0QsT0FBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHUCxNQUFNLENBQUNQLElBQTNCLEVBQWlDYyxDQUFDLElBQUksQ0FBdEMsRUFBeUM7QUFDckMsUUFBSSxDQUFDUCxNQUFNLENBQUNOLEdBQVAsQ0FBV1csS0FBSyxDQUFDTCxNQUFOLENBQWFPLENBQWIsQ0FBWCxDQUFMLEVBQWtDO0FBQzlCLGFBQU8sS0FBUDtBQUNIO0FBQ0o7O0FBQ0QsU0FBTyxJQUFQO0FBQ0g7O0FBRUQsU0FBU0MsY0FBVCxDQUF3QlIsTUFBeEIsRUFBZ0VTLFVBQWhFLEVBQTRHO0FBQ3hHLFFBQU1DLE9BQU8sR0FBR0QsVUFBVSxDQUFDQyxPQUFYLENBQW1CQyxNQUFuQixDQUEwQkMsQ0FBQyxJQUFJUixpQkFBaUIsQ0FBQ0osTUFBRCxFQUFTWSxDQUFULENBQWhELENBQWhCO0FBQ0EsU0FBT0YsT0FBTyxDQUFDSixNQUFSLEdBQWlCLENBQWpCLEdBQXFCSSxPQUFyQixHQUErQixJQUF0QztBQUNIOztBQUVELFNBQVNHLGtCQUFULENBQ0lDLE9BREosRUFFSWQsTUFGSixFQUdJSyxLQUhKLEVBSVc7QUFDUCxNQUFJUyxPQUFPLENBQUNSLE1BQVIsS0FBbUIsQ0FBdkIsRUFBMEI7QUFDdEIsV0FBTyxJQUFQO0FBQ0g7O0FBQ0QsTUFBSVMsUUFBUSxHQUFHLENBQWY7O0FBQ0EsT0FBSyxJQUFJQyxNQUFNLEdBQUcsQ0FBbEIsRUFBcUJBLE1BQU0sR0FBR1gsS0FBSyxDQUFDTCxNQUFOLENBQWFNLE1BQTNDLEVBQW1EVSxNQUFNLElBQUksQ0FBN0QsRUFBZ0U7QUFDNUQsVUFBTUMsVUFBVSxHQUFHWixLQUFLLENBQUNMLE1BQU4sQ0FBYWdCLE1BQWIsQ0FBbkI7O0FBQ0EsUUFBSUMsVUFBVSxLQUFLSCxPQUFPLENBQUNDLFFBQUQsQ0FBUCxDQUFrQkcsSUFBckMsRUFBMkM7QUFDdkNILE1BQUFBLFFBQVEsSUFBSSxDQUFaOztBQUNBLFVBQUlBLFFBQVEsSUFBSUQsT0FBTyxDQUFDUixNQUF4QixFQUFnQztBQUM1QixlQUFPLElBQVA7QUFDSDtBQUNKLEtBTEQsTUFLTztBQUNILFVBQUlTLFFBQVEsR0FBRyxDQUFmLEVBQWtCO0FBQ2QsZUFBTyxLQUFQO0FBQ0g7O0FBQ0QsWUFBTUksS0FBSyxHQUFHbkIsTUFBTSxDQUFDb0IsR0FBUCxDQUFXSCxVQUFYLENBQWQ7O0FBQ0EsVUFBSSxDQUFDRSxLQUFMLEVBQVk7QUFDUixlQUFPLEtBQVA7QUFDSDs7QUFDRCxVQUFJLENBQUM3QixNQUFNLENBQUM2QixLQUFLLENBQUNoQixVQUFQLEVBQW1CLElBQW5CLENBQVgsRUFBcUM7QUFDakMsZUFBTyxLQUFQO0FBQ0g7QUFDSjtBQUNKOztBQUNELFNBQU8sSUFBUDtBQUNIOztBQUVELFNBQVNrQix1QkFBVCxDQUNJUCxPQURKLEVBRUlkLE1BRkosRUFHSVUsT0FISixFQUlXO0FBQ1AsT0FBSyxJQUFJSCxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHRyxPQUFPLENBQUNKLE1BQTVCLEVBQW9DQyxDQUFDLElBQUksQ0FBekMsRUFBNEM7QUFDeEMsUUFBSSxDQUFDTSxrQkFBa0IsQ0FBQ0MsT0FBRCxFQUFVZCxNQUFWLEVBQWtCVSxPQUFPLENBQUNILENBQUQsQ0FBekIsQ0FBdkIsRUFBc0Q7QUFDbEQsYUFBTyxLQUFQO0FBQ0g7QUFDSjs7QUFDRCxTQUFPRyxPQUFPLENBQUNKLE1BQVIsR0FBaUIsQ0FBeEI7QUFDSDs7QUFFRCxTQUFTZ0IscUJBQVQsQ0FDSVIsT0FESixFQUVJZCxNQUZKLEVBR0lVLE9BSEosRUFJVztBQUNQLE9BQUssSUFBSUgsQ0FBQyxHQUFHLENBQWIsRUFBZ0JBLENBQUMsR0FBR0csT0FBTyxDQUFDSixNQUE1QixFQUFvQ0MsQ0FBQyxJQUFJLENBQXpDLEVBQTRDO0FBQ3hDLFFBQUlNLGtCQUFrQixDQUFDQyxPQUFELEVBQVVkLE1BQVYsRUFBa0JVLE9BQU8sQ0FBQ0gsQ0FBRCxDQUF6QixDQUF0QixFQUFxRDtBQUNqRCxhQUFPLElBQVA7QUFDSDtBQUNKOztBQUNELFNBQU8sS0FBUDtBQUNIOztBQUVELFNBQVNnQixRQUFULENBQWtCdkIsTUFBbEIsRUFBbUU7QUFDL0QsUUFBTXdCLEdBQUcsR0FBR3hCLE1BQU0sQ0FBQ29CLEdBQVAsQ0FBVyxNQUFYLENBQVo7QUFDQSxTQUFPLENBQUMsRUFBRUksR0FBRyxJQUFJbEMsTUFBTSxDQUFDa0MsR0FBRyxDQUFDckIsVUFBTCxFQUFpQixJQUFqQixDQUFmLENBQVI7QUFDSDs7QUFFRCxTQUFTc0IsYUFBVCxDQUNJQyxPQURKLEVBRUlDLEdBRkosRUFHSWhCLE1BSEosRUFJSUcsT0FKSixFQUtJZCxNQUxKLEVBTUlTLFVBTkosRUFPSW1CLGVBUEosRUFRRTtBQUNFLFFBQU1DLFNBQW1CLEdBQUcsRUFBNUI7O0FBQ0EsT0FBSyxNQUFNLENBQUNDLElBQUQsRUFBTzdCLFdBQVAsQ0FBWCxJQUFrQ0QsTUFBTSxDQUFDK0IsT0FBUCxFQUFsQyxFQUFvRDtBQUNoREYsSUFBQUEsU0FBUyxDQUFDRyxJQUFWLENBQWdCLEdBQUVGLElBQUssSUFBR0csS0FBSyxDQUFDQyxJQUFOLENBQVdqQyxXQUFXLENBQUNFLFVBQXZCLEVBQW1DZ0MsSUFBbkMsQ0FBd0MsT0FBeEMsQ0FBaUQsRUFBM0U7QUFDSDs7QUFDRFIsRUFBQUEsR0FBRyxDQUFDUyxLQUFKLENBQVVWLE9BQVYsRUFBbUI7QUFDZmpCLElBQUFBLFVBQVUsRUFBRUEsVUFBVSxDQUFDcUIsSUFEUjtBQUVmbkIsSUFBQUEsTUFGZTtBQUdmRyxJQUFBQSxPQUFPLEVBQUUsOEJBQWdCQSxPQUFoQixDQUhNO0FBSWZkLElBQUFBLE1BQU0sRUFBRTZCLFNBSk87QUFLZixRQUFJRCxlQUFlLEdBQUc7QUFBQ0EsTUFBQUEsZUFBZSxFQUFFQSxlQUFlLENBQUNTLEdBQWhCLENBQW9CQyxzQkFBcEI7QUFBbEIsS0FBSCxHQUEyRCxFQUE5RSxDQUxlO0FBTWZDLElBQUFBLGdCQUFnQixFQUFFOUIsVUFBVSxDQUFDQyxPQUFYLENBQW1CMkIsR0FBbkIsQ0FBdUJDLHNCQUF2QjtBQU5ILEdBQW5CO0FBU0g7O0FBRUQsU0FBU0Usb0JBQVQsQ0FDSS9CLFVBREosRUFFSWdDLElBRkosRUFHSTlCLE1BSEosRUFJSUcsT0FKSixFQUtJYSxHQUxKLEVBTVc7QUFDUCxRQUFNZSxNQUFNLEdBQUcsSUFBSUMsZ0JBQUosQ0FBWTtBQUN2QkMsSUFBQUEsT0FBTyxFQUFFO0FBRGMsR0FBWixDQUFmO0FBR0FILEVBQUFBLElBQUksQ0FBQ0ksZUFBTCxDQUFxQkgsTUFBckIsRUFBNkIsRUFBN0IsRUFBaUMvQixNQUFqQzs7QUFDQSxNQUFJLENBQUMrQixNQUFNLENBQUN6QyxXQUFaLEVBQXlCO0FBQ3JCLFdBQU8sS0FBUDtBQUNIOztBQUNELFFBQU1ELE1BQU0sR0FBRyxJQUFJOEMsR0FBSixFQUFmOztBQUNBLE9BQUssTUFBTSxDQUFDM0IsS0FBRCxFQUFRbEIsV0FBUixDQUFYLElBQW1DeUMsTUFBTSxDQUFDekMsV0FBUCxDQUFtQkQsTUFBdEQsRUFBOEQ7QUFDMUQsUUFBSW1CLEtBQUssS0FBSyxRQUFkLEVBQXdCO0FBQ3BCbkIsTUFBQUEsTUFBTSxDQUFDK0MsR0FBUCxDQUFXNUIsS0FBWCxFQUFrQmxCLFdBQWxCO0FBQ0g7QUFDSjs7QUFDRCxNQUFJc0IsUUFBUSxDQUFDdkIsTUFBRCxDQUFaLEVBQXNCO0FBQ2xCLFdBQU8sSUFBUDtBQUNIOztBQUNELE1BQUksQ0FBQ0QsK0JBQStCLENBQUNDLE1BQUQsQ0FBcEMsRUFBOEM7QUFDMUMsUUFBSTJCLEdBQUosRUFBUztBQUNMRixNQUFBQSxhQUFhLENBQ1Qsb0RBRFMsRUFFVEUsR0FGUyxFQUVKaEIsTUFGSSxFQUVJRyxPQUZKLEVBRWFkLE1BRmIsRUFFcUJTLFVBRnJCLENBQWI7QUFJSDs7QUFDRCxXQUFPLEtBQVA7QUFDSDs7QUFFRCxRQUFNQyxPQUFPLEdBQUdGLGNBQWMsQ0FBQ1IsTUFBRCxFQUFTUyxVQUFULENBQTlCOztBQUNBLE1BQUksQ0FBQ0MsT0FBTCxFQUFjO0FBQ1YsUUFBSWlCLEdBQUosRUFBUztBQUNMRixNQUFBQSxhQUFhLENBQ1Qsb0RBRFMsRUFFVEUsR0FGUyxFQUVKaEIsTUFGSSxFQUVJRyxPQUZKLEVBRWFkLE1BRmIsRUFFcUJTLFVBRnJCLENBQWI7QUFJSDs7QUFDRCxXQUFPLEtBQVA7QUFDSDs7QUFFRCxNQUFJSyxPQUFPLENBQUNSLE1BQVIsR0FBaUIsQ0FBckIsRUFBd0I7QUFDcEIsUUFBSU4sTUFBTSxDQUFDUCxJQUFQLEtBQWdCLENBQXBCLEVBQXVCO0FBQ25CLFVBQUksQ0FBQzZCLHFCQUFxQixDQUFDUixPQUFELEVBQVVkLE1BQVYsRUFBa0JVLE9BQWxCLENBQTFCLEVBQXNEO0FBQ2xELFlBQUlpQixHQUFKLEVBQVM7QUFDTEYsVUFBQUEsYUFBYSxDQUNULHdDQURTLEVBRVRFLEdBRlMsRUFFSmhCLE1BRkksRUFFSUcsT0FGSixFQUVhZCxNQUZiLEVBRXFCUyxVQUZyQixFQUVpQ0MsT0FGakMsQ0FBYjtBQUlIOztBQUNELGVBQU8sS0FBUDtBQUNIO0FBQ0osS0FWRCxNQVVPO0FBQ0gsVUFBSSxDQUFDVyx1QkFBdUIsQ0FBQ1AsT0FBRCxFQUFVZCxNQUFWLEVBQWtCVSxPQUFsQixDQUE1QixFQUF3RDtBQUNwRCxZQUFJaUIsR0FBSixFQUFTO0FBQ0xGLFVBQUFBLGFBQWEsQ0FDVCwwQ0FEUyxFQUVURSxHQUZTLEVBRUpoQixNQUZJLEVBRUlHLE9BRkosRUFFYWQsTUFGYixFQUVxQlMsVUFGckIsRUFFaUNDLE9BRmpDLENBQWI7QUFJSDs7QUFDRCxlQUFPLEtBQVA7QUFDSDtBQUNKO0FBQ0o7O0FBRUQsU0FBTyxJQUFQO0FBQ0g7O0FBRU0sU0FBU3NDLFdBQVQsQ0FDSHZDLFVBREcsRUFFSGdDLElBRkcsRUFHSDlCLE1BSEcsRUFJSEcsT0FKRyxFQUtIYSxHQUxHLEVBTUk7QUFDUCxRQUFNc0IsVUFBVSxHQUFHLHNCQUFRdEMsTUFBUixDQUFuQjs7QUFDQSxPQUFLLElBQUlKLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLEdBQUcwQyxVQUFVLENBQUMzQyxNQUEvQixFQUF1Q0MsQ0FBQyxJQUFJLENBQTVDLEVBQStDO0FBQzNDLFFBQUksQ0FBQ2lDLG9CQUFvQixDQUFDL0IsVUFBRCxFQUFhZ0MsSUFBYixFQUFtQlEsVUFBVSxDQUFDMUMsQ0FBRCxDQUE3QixFQUFrQ08sT0FBbEMsRUFBMkNhLEdBQTNDLENBQXpCLEVBQTBFO0FBQ3RFLGFBQU8sS0FBUDtBQUNIO0FBQ0o7O0FBQ0QsU0FBTyxJQUFQO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIvLyBAZmxvd1xuXG5cbmltcG9ydCB0eXBlIHsgQ29sbGVjdGlvbkluZm8sIEluZGV4SW5mbyB9IGZyb20gXCIuL2NvbmZpZ1wiO1xuaW1wb3J0IHsgaW5kZXhUb1N0cmluZywgb3JkZXJCeVRvU3RyaW5nLCBRUGFyYW1zLCBzcGxpdE9yIH0gZnJvbSBcIi4vZGItdHlwZXNcIjtcbmltcG9ydCB0eXBlIHtPcmRlckJ5LCBRRmllbGRFeHBsYW5hdGlvbiwgUVR5cGV9IGZyb20gXCIuL2RiLXR5cGVzXCI7XG5pbXBvcnQgdHlwZSB7UUxvZ30gZnJvbSAnLi9sb2dzJztcblxuZnVuY3Rpb24gc2V0SXMxKHM6IFNldDxzdHJpbmc+LCBhOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gcy5zaXplID09PSAxICYmIHMuaGFzKGEpO1xufVxuXG5mdW5jdGlvbiBzZXRJczIoczogU2V0PHN0cmluZz4sIGE6IHN0cmluZywgYjogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHMuc2l6ZSA9PT0gMiAmJiBzLmhhcyhhKSAmJiBzLmhhcyhiKTtcbn1cblxuZnVuY3Rpb24gY2FuVXNlSW5kZXhlZFJhbmdlKG9wczogU2V0PHN0cmluZz4pOiBib29sZWFuIHtcbiAgICByZXR1cm4gc2V0SXMxKG9wcywgJz09JylcbiAgICAgICAgfHwgc2V0SXMxKG9wcywgJyE9JylcbiAgICAgICAgfHwgc2V0SXMxKG9wcywgJz4nKVxuICAgICAgICB8fCBzZXRJczIob3BzLCAnPicsICc8JylcbiAgICAgICAgfHwgc2V0SXMyKG9wcywgJz4nLCAnPD0nKVxuICAgICAgICB8fCBzZXRJczEob3BzLCAnPj0nKVxuICAgICAgICB8fCBzZXRJczIob3BzLCAnPj0nLCAnPCcpXG4gICAgICAgIHx8IHNldElzMihvcHMsICc+PScsICc8PScpXG4gICAgICAgIHx8IHNldElzMShvcHMsICc8JylcbiAgICAgICAgfHwgc2V0SXMxKG9wcywgJzw9Jyk7XG59XG5cbmZ1bmN0aW9uIGNhblVzZUNvbmRpdGlvbnNGb3JJbmRleGVkUmFuZ2UoZmllbGRzOiBNYXA8c3RyaW5nLCBRRmllbGRFeHBsYW5hdGlvbj4pOiBib29sZWFuIHtcbiAgICBmb3IgKGNvbnN0IGV4cGxhbmF0aW9uIG9mIGZpZWxkcy52YWx1ZXMoKSkge1xuICAgICAgICBpZiAoIWNhblVzZUluZGV4ZWRSYW5nZShleHBsYW5hdGlvbi5vcGVyYXRpb25zKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiBmaWVsZHNDYW5Vc2VJbmRleChmaWVsZHM6IE1hcDxzdHJpbmcsIFFGaWVsZEV4cGxhbmF0aW9uPiwgaW5kZXg6IEluZGV4SW5mbyk6IGJvb2xlYW4ge1xuICAgIGlmIChmaWVsZHMuc2l6ZSA+IGluZGV4LmZpZWxkcy5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZpZWxkcy5zaXplOyBpICs9IDEpIHtcbiAgICAgICAgaWYgKCFmaWVsZHMuaGFzKGluZGV4LmZpZWxkc1tpXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZ2V0VXNlZEluZGV4ZXMoZmllbGRzOiBNYXA8c3RyaW5nLCBRRmllbGRFeHBsYW5hdGlvbj4sIGNvbGxlY3Rpb246IENvbGxlY3Rpb25JbmZvKTogPyhJbmRleEluZm9bXSkge1xuICAgIGNvbnN0IGluZGV4ZXMgPSBjb2xsZWN0aW9uLmluZGV4ZXMuZmlsdGVyKHggPT4gZmllbGRzQ2FuVXNlSW5kZXgoZmllbGRzLCB4KSk7XG4gICAgcmV0dXJuIGluZGV4ZXMubGVuZ3RoID4gMCA/IGluZGV4ZXMgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBvcmRlckJ5Q2FuVXNlSW5kZXgoXG4gICAgb3JkZXJCeTogT3JkZXJCeVtdLFxuICAgIGZpZWxkczogTWFwPHN0cmluZywgUUZpZWxkRXhwbGFuYXRpb24+LFxuICAgIGluZGV4OiBJbmRleEluZm8sXG4pOiBib29sZWFuIHtcbiAgICBpZiAob3JkZXJCeS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGxldCBpT3JkZXJCeSA9IDA7XG4gICAgZm9yIChsZXQgaUluZGV4ID0gMDsgaUluZGV4IDwgaW5kZXguZmllbGRzLmxlbmd0aDsgaUluZGV4ICs9IDEpIHtcbiAgICAgICAgY29uc3QgaW5kZXhGaWVsZCA9IGluZGV4LmZpZWxkc1tpSW5kZXhdO1xuICAgICAgICBpZiAoaW5kZXhGaWVsZCA9PT0gb3JkZXJCeVtpT3JkZXJCeV0ucGF0aCkge1xuICAgICAgICAgICAgaU9yZGVyQnkgKz0gMTtcbiAgICAgICAgICAgIGlmIChpT3JkZXJCeSA+PSBvcmRlckJ5Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKGlPcmRlckJ5ID4gMCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGZpZWxkID0gZmllbGRzLmdldChpbmRleEZpZWxkKTtcbiAgICAgICAgICAgIGlmICghZmllbGQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXNldElzMShmaWVsZC5vcGVyYXRpb25zLCAnPT0nKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gb3JkZXJCeUNhblVzZUFsbEluZGV4ZXMoXG4gICAgb3JkZXJCeTogT3JkZXJCeVtdLFxuICAgIGZpZWxkczogTWFwPHN0cmluZywgUUZpZWxkRXhwbGFuYXRpb24+LFxuICAgIGluZGV4ZXM6IEluZGV4SW5mb1tdLFxuKTogYm9vbGVhbiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbmRleGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGlmICghb3JkZXJCeUNhblVzZUluZGV4KG9yZGVyQnksIGZpZWxkcywgaW5kZXhlc1tpXSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gaW5kZXhlcy5sZW5ndGggPiAwO1xufVxuXG5mdW5jdGlvbiBvcmRlckJ5Q2FuVXNlQW55SW5kZXgoXG4gICAgb3JkZXJCeTogT3JkZXJCeVtdLFxuICAgIGZpZWxkczogTWFwPHN0cmluZywgUUZpZWxkRXhwbGFuYXRpb24+LFxuICAgIGluZGV4ZXM6IEluZGV4SW5mb1tdLFxuKTogYm9vbGVhbiB7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBpbmRleGVzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGlmIChvcmRlckJ5Q2FuVXNlSW5kZXgob3JkZXJCeSwgZmllbGRzLCBpbmRleGVzW2ldKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xufVxuXG5mdW5jdGlvbiBoYXNLZXlFcShmaWVsZHM6IE1hcDxzdHJpbmcsIFFGaWVsZEV4cGxhbmF0aW9uPik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IGtleSA9IGZpZWxkcy5nZXQoJ19rZXknKTtcbiAgICByZXR1cm4gISEoa2V5ICYmIHNldElzMShrZXkub3BlcmF0aW9ucywgJz09JykpO1xufVxuXG5mdW5jdGlvbiBsb2dTbG93UmVhc29uKFxuICAgIG1lc3NhZ2U6IHN0cmluZyxcbiAgICBsb2c6IFFMb2csXG4gICAgZmlsdGVyOiBhbnksXG4gICAgb3JkZXJCeTogT3JkZXJCeVtdLFxuICAgIGZpZWxkczogTWFwPHN0cmluZywgUUZpZWxkRXhwbGFuYXRpb24+LFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25JbmZvLFxuICAgIHNlbGVjdGVkSW5kZXhlcz86IEluZGV4SW5mb1tdLFxuKSB7XG4gICAgY29uc3QgbG9nRmllbGRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW25hbWUsIGV4cGxhbmF0aW9uXSBvZiBmaWVsZHMuZW50cmllcygpKSB7XG4gICAgICAgIGxvZ0ZpZWxkcy5wdXNoKGAke25hbWV9ICR7QXJyYXkuZnJvbShleHBsYW5hdGlvbi5vcGVyYXRpb25zKS5qb2luKCcgQU5EICcpfWApO1xuICAgIH1cbiAgICBsb2cuZGVidWcobWVzc2FnZSwge1xuICAgICAgICBjb2xsZWN0aW9uOiBjb2xsZWN0aW9uLm5hbWUsXG4gICAgICAgIGZpbHRlcixcbiAgICAgICAgb3JkZXJCeTogb3JkZXJCeVRvU3RyaW5nKG9yZGVyQnkpLFxuICAgICAgICBmaWVsZHM6IGxvZ0ZpZWxkcyxcbiAgICAgICAgLi4uKHNlbGVjdGVkSW5kZXhlcyA/IHtzZWxlY3RlZEluZGV4ZXM6IHNlbGVjdGVkSW5kZXhlcy5tYXAoaW5kZXhUb1N0cmluZyl9IDoge30pLFxuICAgICAgICBhdmFpbGFibGVJbmRleGVzOiBjb2xsZWN0aW9uLmluZGV4ZXMubWFwKGluZGV4VG9TdHJpbmcpLFxuICAgIH0pO1xuXG59XG5cbmZ1bmN0aW9uIGlzRmFzdFF1ZXJ5T3JPcGVyYW5kKFxuICAgIGNvbGxlY3Rpb246IENvbGxlY3Rpb25JbmZvLFxuICAgIHR5cGU6IFFUeXBlLFxuICAgIGZpbHRlcjogYW55LFxuICAgIG9yZGVyQnk6IE9yZGVyQnlbXSxcbiAgICBsb2c6ID9RTG9nLFxuKTogYm9vbGVhbiB7XG4gICAgY29uc3QgcGFyYW1zID0gbmV3IFFQYXJhbXMoe1xuICAgICAgICBleHBsYWluOiB0cnVlLFxuICAgIH0pO1xuICAgIHR5cGUuZmlsdGVyQ29uZGl0aW9uKHBhcmFtcywgJycsIGZpbHRlcik7XG4gICAgaWYgKCFwYXJhbXMuZXhwbGFuYXRpb24pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBjb25zdCBmaWVsZHMgPSBuZXcgTWFwPHN0cmluZywgUUZpZWxkRXhwbGFuYXRpb24+KCk7XG4gICAgZm9yIChjb25zdCBbZmllbGQsIGV4cGxhbmF0aW9uXSBvZiBwYXJhbXMuZXhwbGFuYXRpb24uZmllbGRzKSB7XG4gICAgICAgIGlmIChmaWVsZCAhPT0gJ3N0YXR1cycpIHtcbiAgICAgICAgICAgIGZpZWxkcy5zZXQoZmllbGQsIGV4cGxhbmF0aW9uKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICBpZiAoaGFzS2V5RXEoZmllbGRzKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKCFjYW5Vc2VDb25kaXRpb25zRm9ySW5kZXhlZFJhbmdlKGZpZWxkcykpIHtcbiAgICAgICAgaWYgKGxvZykge1xuICAgICAgICAgICAgbG9nU2xvd1JlYXNvbihcbiAgICAgICAgICAgICAgICAnRmlsdGVyIG9wZXJhdGlvbnMgY2FuXFwndCBiZSB1c2VkIGluIHJhbmdlZCBxdWVyaWVzJyxcbiAgICAgICAgICAgICAgICBsb2csIGZpbHRlciwgb3JkZXJCeSwgZmllbGRzLCBjb2xsZWN0aW9uLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgY29uc3QgaW5kZXhlcyA9IGdldFVzZWRJbmRleGVzKGZpZWxkcywgY29sbGVjdGlvbik7XG4gICAgaWYgKCFpbmRleGVzKSB7XG4gICAgICAgIGlmIChsb2cpIHtcbiAgICAgICAgICAgIGxvZ1Nsb3dSZWFzb24oXG4gICAgICAgICAgICAgICAgJ0F2YWlsYWJsZSBpbmRleGVzIGNhblxcJ3QgYmUgdXNlZCBmb3IgZmlsdGVyIGZpZWxkcycsXG4gICAgICAgICAgICAgICAgbG9nLCBmaWx0ZXIsIG9yZGVyQnksIGZpZWxkcywgY29sbGVjdGlvbixcbiAgICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChvcmRlckJ5Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgaWYgKGZpZWxkcy5zaXplID09PSAwKSB7XG4gICAgICAgICAgICBpZiAoIW9yZGVyQnlDYW5Vc2VBbnlJbmRleChvcmRlckJ5LCBmaWVsZHMsIGluZGV4ZXMpKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxvZykge1xuICAgICAgICAgICAgICAgICAgICBsb2dTbG93UmVhc29uKFxuICAgICAgICAgICAgICAgICAgICAgICAgJ09yZGVyIGJ5IGNhblxcJ3QgdXNlIGFueSBzZWxlY3RlZCBpbmRleCcsXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2csIGZpbHRlciwgb3JkZXJCeSwgZmllbGRzLCBjb2xsZWN0aW9uLCBpbmRleGVzLFxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoIW9yZGVyQnlDYW5Vc2VBbGxJbmRleGVzKG9yZGVyQnksIGZpZWxkcywgaW5kZXhlcykpIHtcbiAgICAgICAgICAgICAgICBpZiAobG9nKSB7XG4gICAgICAgICAgICAgICAgICAgIGxvZ1Nsb3dSZWFzb24oXG4gICAgICAgICAgICAgICAgICAgICAgICAnT3JkZXIgYnkgY2FuXFwndCB1c2UgYWxsIHNlbGVjdGVkIGluZGV4ZXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgbG9nLCBmaWx0ZXIsIG9yZGVyQnksIGZpZWxkcywgY29sbGVjdGlvbiwgaW5kZXhlcyxcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc0Zhc3RRdWVyeShcbiAgICBjb2xsZWN0aW9uOiBDb2xsZWN0aW9uSW5mbyxcbiAgICB0eXBlOiBRVHlwZSxcbiAgICBmaWx0ZXI6IGFueSxcbiAgICBvcmRlckJ5OiBPcmRlckJ5W10sXG4gICAgbG9nOiA/UUxvZyxcbik6IGJvb2xlYW4ge1xuICAgIGNvbnN0IG9yT3BlcmFuZHMgPSBzcGxpdE9yKGZpbHRlcik7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBvck9wZXJhbmRzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgIGlmICghaXNGYXN0UXVlcnlPck9wZXJhbmQoY29sbGVjdGlvbiwgdHlwZSwgb3JPcGVyYW5kc1tpXSwgb3JkZXJCeSwgbG9nKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufVxuIl19
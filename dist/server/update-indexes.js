"use strict";

const {
  Database
} = require('arangojs');

const {
  BLOCKCHAIN_DB
} = require('./config');

function sameFields(a, b) {
  return a.join(',').toLowerCase() === b.join(',').toLowerCase();
}

async function updateCollection(collection, db) {
  const existingIndexes = await db.collection(collection.name).indexes();
  existingIndexes.forEach(existing => {
    if (!collection.indexes.find(x => sameFields(x.fields, existing.fields))) {
      console.log(`${collection.name}: remove index [${existing.id}] on [${existing.fields.join(',')}]`);
      db.collection(collection.name).dropIndex(existing.id);
    }
  });
  collection.indexes.forEach(required => {
    if (!existingIndexes.find(x => sameFields(x.fields, required.fields))) {
      console.log(`${collection.name}: create index on [${required.fields.join(',')}]`);
      db.collection(collection.name).createPersistentIndex(required.fields);
    }
  });
}

async function updateDb(config) {
  const db = new Database({
    url: config.server
  });
  db.useDatabase(config.name);

  if (config.auth) {
    const authParts = config.auth.split(':');
    db.useBasicAuth(authParts[0], authParts.slice(1).join(':'));
  }

  for (const collection of [...Object.values(BLOCKCHAIN_DB.collections)]) {
    await updateCollection(collection, db);
  }
}

const configs = [{
  server: 'http://localhost:8081',
  name: BLOCKCHAIN_DB.name
}];

(async () => {
  console.log('>>>', process.argv);

  for (const config of configs) {
    await updateDb(config);
  }
})();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NlcnZlci91cGRhdGUtaW5kZXhlcy5qcyJdLCJuYW1lcyI6WyJEYXRhYmFzZSIsInJlcXVpcmUiLCJCTE9DS0NIQUlOX0RCIiwic2FtZUZpZWxkcyIsImEiLCJiIiwiam9pbiIsInRvTG93ZXJDYXNlIiwidXBkYXRlQ29sbGVjdGlvbiIsImNvbGxlY3Rpb24iLCJkYiIsImV4aXN0aW5nSW5kZXhlcyIsIm5hbWUiLCJpbmRleGVzIiwiZm9yRWFjaCIsImV4aXN0aW5nIiwiZmluZCIsIngiLCJmaWVsZHMiLCJjb25zb2xlIiwibG9nIiwiaWQiLCJkcm9wSW5kZXgiLCJyZXF1aXJlZCIsImNyZWF0ZVBlcnNpc3RlbnRJbmRleCIsInVwZGF0ZURiIiwiY29uZmlnIiwidXJsIiwic2VydmVyIiwidXNlRGF0YWJhc2UiLCJhdXRoIiwiYXV0aFBhcnRzIiwic3BsaXQiLCJ1c2VCYXNpY0F1dGgiLCJzbGljZSIsIk9iamVjdCIsInZhbHVlcyIsImNvbGxlY3Rpb25zIiwiY29uZmlncyIsInByb2Nlc3MiLCJhcmd2Il0sIm1hcHBpbmdzIjoiOztBQUFBLE1BQU07QUFBRUEsRUFBQUE7QUFBRixJQUFlQyxPQUFPLENBQUMsVUFBRCxDQUE1Qjs7QUFDQSxNQUFNO0FBQUVDLEVBQUFBO0FBQUYsSUFBb0JELE9BQU8sQ0FBQyxVQUFELENBQWpDOztBQUVBLFNBQVNFLFVBQVQsQ0FBb0JDLENBQXBCLEVBQXVCQyxDQUF2QixFQUEwQjtBQUN0QixTQUFPRCxDQUFDLENBQUNFLElBQUYsQ0FBTyxHQUFQLEVBQVlDLFdBQVosT0FBOEJGLENBQUMsQ0FBQ0MsSUFBRixDQUFPLEdBQVAsRUFBWUMsV0FBWixFQUFyQztBQUNIOztBQUVELGVBQWVDLGdCQUFmLENBQWdDQyxVQUFoQyxFQUE0Q0MsRUFBNUMsRUFBZ0Q7QUFDNUMsUUFBTUMsZUFBZSxHQUFHLE1BQU1ELEVBQUUsQ0FBQ0QsVUFBSCxDQUFjQSxVQUFVLENBQUNHLElBQXpCLEVBQStCQyxPQUEvQixFQUE5QjtBQUNBRixFQUFBQSxlQUFlLENBQUNHLE9BQWhCLENBQXlCQyxRQUFELElBQWM7QUFDbEMsUUFBSSxDQUFDTixVQUFVLENBQUNJLE9BQVgsQ0FBbUJHLElBQW5CLENBQXdCQyxDQUFDLElBQUlkLFVBQVUsQ0FBQ2MsQ0FBQyxDQUFDQyxNQUFILEVBQVdILFFBQVEsQ0FBQ0csTUFBcEIsQ0FBdkMsQ0FBTCxFQUEwRTtBQUN0RUMsTUFBQUEsT0FBTyxDQUFDQyxHQUFSLENBQWEsR0FBRVgsVUFBVSxDQUFDRyxJQUFLLG1CQUFrQkcsUUFBUSxDQUFDTSxFQUFHLFNBQVFOLFFBQVEsQ0FBQ0csTUFBVCxDQUFnQlosSUFBaEIsQ0FBcUIsR0FBckIsQ0FBMEIsR0FBL0Y7QUFDQUksTUFBQUEsRUFBRSxDQUFDRCxVQUFILENBQWNBLFVBQVUsQ0FBQ0csSUFBekIsRUFBK0JVLFNBQS9CLENBQXlDUCxRQUFRLENBQUNNLEVBQWxEO0FBQ0g7QUFDSixHQUxEO0FBTUFaLEVBQUFBLFVBQVUsQ0FBQ0ksT0FBWCxDQUFtQkMsT0FBbkIsQ0FBNEJTLFFBQUQsSUFBYztBQUNyQyxRQUFJLENBQUNaLGVBQWUsQ0FBQ0ssSUFBaEIsQ0FBcUJDLENBQUMsSUFBSWQsVUFBVSxDQUFDYyxDQUFDLENBQUNDLE1BQUgsRUFBV0ssUUFBUSxDQUFDTCxNQUFwQixDQUFwQyxDQUFMLEVBQXVFO0FBQ25FQyxNQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBYSxHQUFFWCxVQUFVLENBQUNHLElBQUssc0JBQXFCVyxRQUFRLENBQUNMLE1BQVQsQ0FBZ0JaLElBQWhCLENBQXFCLEdBQXJCLENBQTBCLEdBQTlFO0FBQ0FJLE1BQUFBLEVBQUUsQ0FBQ0QsVUFBSCxDQUFjQSxVQUFVLENBQUNHLElBQXpCLEVBQStCWSxxQkFBL0IsQ0FBcURELFFBQVEsQ0FBQ0wsTUFBOUQ7QUFDSDtBQUNKLEdBTEQ7QUFNSDs7QUFFRCxlQUFlTyxRQUFmLENBQXdCQyxNQUF4QixFQUFnQztBQUM1QixRQUFNaEIsRUFBRSxHQUFHLElBQUlWLFFBQUosQ0FBYTtBQUNwQjJCLElBQUFBLEdBQUcsRUFBRUQsTUFBTSxDQUFDRTtBQURRLEdBQWIsQ0FBWDtBQUdBbEIsRUFBQUEsRUFBRSxDQUFDbUIsV0FBSCxDQUFlSCxNQUFNLENBQUNkLElBQXRCOztBQUNBLE1BQUljLE1BQU0sQ0FBQ0ksSUFBWCxFQUFpQjtBQUNiLFVBQU1DLFNBQVMsR0FBR0wsTUFBTSxDQUFDSSxJQUFQLENBQVlFLEtBQVosQ0FBa0IsR0FBbEIsQ0FBbEI7QUFDQXRCLElBQUFBLEVBQUUsQ0FBQ3VCLFlBQUgsQ0FBZ0JGLFNBQVMsQ0FBQyxDQUFELENBQXpCLEVBQThCQSxTQUFTLENBQUNHLEtBQVYsQ0FBZ0IsQ0FBaEIsRUFBbUI1QixJQUFuQixDQUF3QixHQUF4QixDQUE5QjtBQUNIOztBQUNELE9BQUssTUFBTUcsVUFBWCxJQUF5QixDQUFDLEdBQUcwQixNQUFNLENBQUNDLE1BQVAsQ0FBY2xDLGFBQWEsQ0FBQ21DLFdBQTVCLENBQUosQ0FBekIsRUFBd0U7QUFDcEUsVUFBTTdCLGdCQUFnQixDQUFDQyxVQUFELEVBQWFDLEVBQWIsQ0FBdEI7QUFDSDtBQUNKOztBQUVELE1BQU00QixPQUFPLEdBQUcsQ0FDWjtBQUNJVixFQUFBQSxNQUFNLEVBQUUsdUJBRFo7QUFFSWhCLEVBQUFBLElBQUksRUFBRVYsYUFBYSxDQUFDVTtBQUZ4QixDQURZLENBQWhCOztBQU9BLENBQUMsWUFBWTtBQUNUTyxFQUFBQSxPQUFPLENBQUNDLEdBQVIsQ0FBWSxLQUFaLEVBQW1CbUIsT0FBTyxDQUFDQyxJQUEzQjs7QUFDQSxPQUFLLE1BQU1kLE1BQVgsSUFBcUJZLE9BQXJCLEVBQThCO0FBQzFCLFVBQU1iLFFBQVEsQ0FBQ0MsTUFBRCxDQUFkO0FBQ0g7QUFDSixDQUxEIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgeyBEYXRhYmFzZSB9ID0gcmVxdWlyZSgnYXJhbmdvanMnKTtcbmNvbnN0IHsgQkxPQ0tDSEFJTl9EQiB9ID0gcmVxdWlyZSgnLi9jb25maWcnKTtcblxuZnVuY3Rpb24gc2FtZUZpZWxkcyhhLCBiKSB7XG4gICAgcmV0dXJuIGEuam9pbignLCcpLnRvTG93ZXJDYXNlKCkgPT09IGIuam9pbignLCcpLnRvTG93ZXJDYXNlKCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvbiwgZGIpIHtcbiAgICBjb25zdCBleGlzdGluZ0luZGV4ZXMgPSBhd2FpdCBkYi5jb2xsZWN0aW9uKGNvbGxlY3Rpb24ubmFtZSkuaW5kZXhlcygpO1xuICAgIGV4aXN0aW5nSW5kZXhlcy5mb3JFYWNoKChleGlzdGluZykgPT4ge1xuICAgICAgICBpZiAoIWNvbGxlY3Rpb24uaW5kZXhlcy5maW5kKHggPT4gc2FtZUZpZWxkcyh4LmZpZWxkcywgZXhpc3RpbmcuZmllbGRzKSkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGAke2NvbGxlY3Rpb24ubmFtZX06IHJlbW92ZSBpbmRleCBbJHtleGlzdGluZy5pZH1dIG9uIFske2V4aXN0aW5nLmZpZWxkcy5qb2luKCcsJyl9XWApO1xuICAgICAgICAgICAgZGIuY29sbGVjdGlvbihjb2xsZWN0aW9uLm5hbWUpLmRyb3BJbmRleChleGlzdGluZy5pZClcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGNvbGxlY3Rpb24uaW5kZXhlcy5mb3JFYWNoKChyZXF1aXJlZCkgPT4ge1xuICAgICAgICBpZiAoIWV4aXN0aW5nSW5kZXhlcy5maW5kKHggPT4gc2FtZUZpZWxkcyh4LmZpZWxkcywgcmVxdWlyZWQuZmllbGRzKSkpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGAke2NvbGxlY3Rpb24ubmFtZX06IGNyZWF0ZSBpbmRleCBvbiBbJHtyZXF1aXJlZC5maWVsZHMuam9pbignLCcpfV1gKTtcbiAgICAgICAgICAgIGRiLmNvbGxlY3Rpb24oY29sbGVjdGlvbi5uYW1lKS5jcmVhdGVQZXJzaXN0ZW50SW5kZXgocmVxdWlyZWQuZmllbGRzKTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVEYihjb25maWcpIHtcbiAgICBjb25zdCBkYiA9IG5ldyBEYXRhYmFzZSh7XG4gICAgICAgIHVybDogY29uZmlnLnNlcnZlcixcbiAgICB9KTtcbiAgICBkYi51c2VEYXRhYmFzZShjb25maWcubmFtZSk7XG4gICAgaWYgKGNvbmZpZy5hdXRoKSB7XG4gICAgICAgIGNvbnN0IGF1dGhQYXJ0cyA9IGNvbmZpZy5hdXRoLnNwbGl0KCc6Jyk7XG4gICAgICAgIGRiLnVzZUJhc2ljQXV0aChhdXRoUGFydHNbMF0sIGF1dGhQYXJ0cy5zbGljZSgxKS5qb2luKCc6JykpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IGNvbGxlY3Rpb24gb2YgWy4uLk9iamVjdC52YWx1ZXMoQkxPQ0tDSEFJTl9EQi5jb2xsZWN0aW9ucyldKSB7XG4gICAgICAgIGF3YWl0IHVwZGF0ZUNvbGxlY3Rpb24oY29sbGVjdGlvbiwgZGIpO1xuICAgIH1cbn1cblxuY29uc3QgY29uZmlncyA9IFtcbiAgICB7XG4gICAgICAgIHNlcnZlcjogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA4MScsXG4gICAgICAgIG5hbWU6IEJMT0NLQ0hBSU5fREIubmFtZSxcbiAgICB9XG5dO1xuXG4oYXN5bmMgKCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKCc+Pj4nLCBwcm9jZXNzLmFyZ3YpO1xuICAgIGZvciAoY29uc3QgY29uZmlnIG9mIGNvbmZpZ3MpIHtcbiAgICAgICAgYXdhaXQgdXBkYXRlRGIoY29uZmlnKTtcbiAgICB9XG59KSgpO1xuXG5cbiJdfQ==
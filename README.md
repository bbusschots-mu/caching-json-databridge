# @maynoothuniversity/caching-json-databridge

A NodeJS module designed to act as caching middle-ware between apps or scripts
that need access to data that can be represented as a JSON string, and sources
of that data.

Each data source must provide one or more data fetching functions which return
a promise of data that can be serialised to a JSON file for caching.

The module provides control over the cache TTL, and the ability to bypass the
cache when truly live data is needed.

## Module Architecture

A *databridge* is an object that manages multiple *datasources*, each of which
contain one or more *data fetcher functions* which accept arbitarily many
parameters, and can be arranged into nested namespaces if desired.

Data returned from data fetchers that accept parameters is split into named
*data streams* for caching. The module does its best to handle this
automatically, but when you need to pass values that can't be converted to
a JSON string as parameters to a data fetcher you'll need to provide a
custom *stream name generaterator* function. When a data fetcher is called with
no parameters the data stream name `main` is used.

As a practical example, a data fetcher that retrieves all movies released in a
given year would need one parameter - the year. A separate cache needs to be
maintained for each year, so each year value should result in a different
stream name. The default stream name generator would convert the single
parameter value `1980` into the stream name `n_1980`. So, if you fetch the
movies for 1980, and then 1982, two separate caches will be created, one for
the stream name `n_1980` and one for the stream name `n_1982`.

Databridges define a default cache TTL, but each datasource can specify a custom
TTL.

To facilitate this, the following four classes are exported by the module:

1. `Databridge` - representing databridges (your app/script will probably
   instantiate just one object of this type)
1. `Datasource` - representing datasources (your app/script will instantiate an
    object of this type for each source of data it needs access to)
1. `FetchRequest` - representing a request to a databridge for a stream of data
   from the cache or a datasource.
1. `FetchResponse` - representing a promise of data returned by a databridge.
   The data could have origintated from the cache or a datasource.
   
## Example

```
// import the module
const cjdb = require('@maynoothuniversity/caching-json-databridge');

// instantiate a databridge with a custom cache location and TTL
let myDB = new cjdb.Databridge({ cacheDir: './cache', defaultCacheTTL: 3600 });

// create a simple datasource that always returns the days of the week
let dowDS = new cjdb.Datasource('daysOfTheWeek', function(){
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday' ];
});

// register the datasource into the bridge
myDB.register(dowDS);

// fetch a promise ofthe data by datasource name
myDB.daysOfTheWeek().then(function(data){
    console.log(data);
});
```

## API Documentation

* https://bbusschots-mu.github.io/caching-json-databridge/

# @maynoothuniversity/caching-json-databridge

A NodeJS module designed to act as caching middle-ware between apps or scripts
that need access to data that can be represented as a JSON string, and sources
of that data.

Each data source must provide a data fetching function which returns a promise
of data that can be serialised to a JSON file for caching.

The module provides control over the cache TTL, and the ability to bypass the
cache when truly live data is needed.

## Module Architecture

A *databridge* is an object that manages multiple *datasources*, each of which
contain one *data fetcher function* which can take arbitarily many arguments,
return data tagged as belonging to arbitarily many separate *data streams*, each
of which is separately cached. By default, every data source is assumed to have
a single data stream named `main`.

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
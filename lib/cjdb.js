/**
 * @file Provides the NodeJS module
 * [caching-json-databridge]{@link module:@maynoothuniversity/caching-json-databridge}. The
 * module is exported as the JavaScript prototype/class
 * [Databridge]{@link module:@maynoothuniversity/caching-json-databridge~Databridge}.
 * @author Bart Busschots <Bart.Busschots@mu.ie>
 * @version 0.0.2
 * @see {@link https://github.com/bbusschots-mu/caching-json-databridge}
 */

// import requirements
const validateParams = require('@maynoothuniversity/validate-params');
const validate = validateParams.validateJS();
const path = require('path');
const fs = require('fs-extra');
const moment = require('moment');

//
//=== JSDoc ground-work ========================================================
//

//
//--- JSDoc Module Desription --------------------------------------------------
//

/**
 * A NodeJS module for gathering data from various sources and making it
 * available as plain JSON objects. The module has built-in support for caching
 * the JSON data.
 *
 * This module exports a namespace containing a collection of JavaScript
 * classes.
 * 
 * @module @maynoothuniversity/caching-json-databridge
 * @requires @maynoothuniversity/validate-params
 * @requires fs-extra
 */

//
//--- JSDoc Externals ----------------------------------------------------------
//

/**
 * A [validate.js]{@link https://validatejs.org/} compatible validator function.
 * @external ValidateJSValidator
 */

/**
 * The `validate.js` module.
 * @external validate
 * @see {@link https://validatejs.org/}
 */

/**
 * The `@maynoothuniversity/validate-params` module.
 * @external validateParams
 * @see {@link https://github.com/bbusschots-mu/validateParams.js}
 */

//
//--- JSDoc Typedefs -----------------------------------------------------------
//

/**
 * A JavaScript plain object as per the
 * [isPlainObject() function from validateParams]{@link external:validateParams.isPlainObject}.
 * @typedef {Object} PlainObject
 */

/**
 * A valid ISO8601 date string.
 * @typedef {string} ISO8601
 * @see {@link https://en.wikipedia.org/wiki/ISO_8601}
 */

/**
 * A valid name for databridge resources like sources and streams. Specifically,
 * a string of three or more characters starting with a letter and containing
 * only letters, digits, and underscores.
 * @typedef {string} DatabridgeName
 */

/**
 * A valid name path for potntially nested databridge resources streams. Can be
 * a single valid databridge name as a string, or an array of valid databridge
 * names.
 * @typedef {(DatabridgeName|DatabridgeName[])} DatabridgeNamePath
 */

/**
 * A valid data fetcher definition. This can be either a single data fetcher
 * callback, or, a potentially nested plain object containing multiple data
 * fether callbacks where all key names are valid databridge resource names.
 * @typedef {(function|PlainObject)} DataFetcher
 * @see DataFetcherCallback
 * @see DatabridgeName
 */

//
//--- JSDoc Callback Definitions -----------------------------------------------
//

/**
 * A data fetcer callback should fetch the data for a given data source, and
 * return it in the form of a plain object that can be serialised to a JSON
 * string.
 *
 * The data fetched should be formatted as a single JavaScript value that can be
 * serialised to a JSON string without error. The callback can return the data
 * directly, or, return a promise of that data.
 *
 * The fetcher function can accept arbitrarily many parameters.
 *
 * When invoked by the databridge, the special `this` variable within the
 * callback will be mapped to the {@link Datasource} object
 * the callback belongs to.
 * 
 * @callback DataFetcherCallback
 * @this Datasource
 * @returns {(PlainObject|Promise)} must return a plain object that can be
 * serialised as a JSON string, or, a promise that resolves to same.
 */

//
//=== Define Globals ===========================================================
//

/**
 * A collection of re-usable parameter constraints for use with the
 * `validateParams.js` validation functions.
 *
 * @namespace
 * @private
 */
const vpCons = {
    /**
     * A constraint to enforce the {@link DatabridgeName} type.
     */
    databridgeName: {
        hasTypeof: 'string',
        format: /[a-zA-Z][a-zA-Z0-9_]{2,}/
    }
};

//
//=== Validation Setup =========================================================
//

/**
 * A collection of custom `validate.js` validator functions.
 * 
 * @namespace
 * @private
 */
const customValidators = {
    /**
     * A validator that tests if the given value is a non-empty string and a
     * path to a folder. Empty values are implicitly passed.
     * @member
     * @type {ValidateJSValidator}
     */
    folderExists: function(val, opts){
        if(validate.isEmpty(val)){
            return undefined; // implicitly pass empty values
        }
        let testPath = '';
        if(validate.isString(val)){
            testPath = path.resolve(val);
            if(fs.existsSync(testPath) && fs.statSync(testPath).isDirectory()){
                return undefined; // all is well
            }
        }
        return validateParams.extractValidatorMessage(this, opts) || `is not a valid file path to a folder (raw: ${val}, resolved to: ${testPath})`;
    },
    
    /**
     * A validator that tests if the given value is an ISO8601 date string.
     * Empty values are implicitly passed.
     * @member
     * @type {ValidateJSValidator}
     */
    iso8601: function(val, opts){
        // implicitly pass empty values
        if(validate.isEmpty(val)) return undefined;
        
        // test the passing case
        if(validate.isString(val) && moment(val, moment.ISO_8601).isValid()){
            return undefined;
        }
        
        // if we got here, we have an error, so return an error message
        return validateParams.extractValidatorMessage(this, opts) || 'is not an ISO 8601 datetime string';
    },
    
    ///**
    // * A validator that tests if the given value is promise. Whether or not a
    // * value is considered a promise is determiend by the
    // * [validate.isPromise()]{@link external:validate.isPromise} function from
    // * validate.js. Undefined values are implicitly passed.
    // * @member
    // * @type {ValidateJSValidator}
    // */
    //promise: function(val, opts){
    //    // implicitly pass empty values
    //    if(!validate.isDefined(val)) return undefined;
    //    
    //    // test the passing case
    //    if(validate.isPromise(val)){
    //        return undefined;
    //    }
    //    
    //    // if we got here, we have an error, so return an error message
    //    return validateParams.extractValidatorMessage(this, opts) || 'is not a promise';
    //}
	
	/**
	 * A validator that tests if a given value is a valid databridge name path.
	 * Undefined values are implicitly passed, as are empty strings. Empty
	 * arrays, or arrays that contain empty strings do not pass.
	 * @see DatabridgeNamePath
	 * @member
	 * @type {ValidateJSValidator}
	 */
	namePath: function(val, opts){
		// implicitly pass undefined values
        if(!validate.isDefined(val)) return undefined;
		
		// determine the error message to use
		let msg = validateParams.extractValidatorMessage(this, opts) || 'is not an valid databridge name path';
		
		// check single strings
		if(validate.isString(val)){
			return validate.single(val, vpCons.datasourceName) ? msg : undefined;
		}
		
		// check arrays
		if(validate.isArray(val)){
			if(val.length === 0) return msg;
			for(let pe of val){
				if(validate.single(pe, validateParams.extendObject({presence: true}, vpCons.databridgeName))){
					return msg;
				}
			}
			return undefined; // if we got here all the elements were valid
		}
		
		// if we got here, the value must be invalid, so return an error
		return msg;
	},
	
	/**
	 * A validator that tests if the given value is a valid data fetcher
	 * definition.
	 * @see DataFetcher
	 * @member
	 * @type {ValidateJSValidator}
	 */
	dataFetcher: function(val, opts){
		// implicitly pass empty values
        if(validate.isEmpty(val)) return undefined;
		
		// if we just got a callback, pass it
		if(validate.isFunction(val)) return undefined;
		
		// determine the error message to use
		let msg = validateParams.extractValidatorMessage(this, opts) || 'is not an valid data fetcher definition';
		
		// if the value is not a plain object, it can't be valid
		if(!validateParams.isPlainObject(val)) return msg;
		
		// check every value in the object, remembering to recurse down
		let checker = function(obj){
			for(let k in obj){
				if(validate.single(k, validateParams.extendObject({defined: true}, vpCons.databridgeName))){
					return false;
				}
				if(validateParams.isPlainObject(obj[k])){
					// BEWARE - recursive call!
					if(!checker(obj[k])) return false;
				}else{
					if(!validate.isFunction(obj[k])) return false;
				}
			}
			return true;
		};
		return checker(val) ? undefined : msg;
	}
};
for(let valName in customValidators){
    validate.validators[valName] = customValidators[valName];
}

//
//=== Define The Main Class ====================================================
//

/**
 * A class representing a data bridge with an associated cache.
 */
class Databridge{
    /**
     * @param {PlainObject} [options] - a plain object defining configuration
     * settings.
     * @param {string} [options.cacheDir='./databridgeJsonCache'] - the path to
     * the folder to use for caching without a trailing separator.
     * @param {number} [options.defaultCacheTTL=3600] - the default time to live
     * for cached data in seconds.
     * @throws {external:validateParams.ValidationError} a validation error is
     * thrown if parameter validation fails.
     */
    constructor(){
        let args = validateParams.assert(arguments, [{
            paramOptions: {
                name: 'options',
                defaultWhenUndefined: {},
                coerce: function(v, o , c){
                    if(validate.isObject(v)){
                        if(typeof v.cacheDir === 'undefined') v.cacheDir = path.join('.', 'databridgeJsonCache');
                        if(typeof v.defaultCacheTTL === 'undefined'){
                            v.defaultCacheTTL = 3600;
                        }else{
                            v.defaultCacheTTL = validateParams.coercions.toNumber(v.defaultCacheTTL, o, c);
                        }
                    }
                    return v;
                }
            },
            defined: true,
            dictionary: {
                mapConstraints : {
                    cacheDir: {
                        presence: true,
                        folderExists: true
                    },
                    defaultCacheTTL: {
                        presence: true,
                        hasTypeof: 'number',
                        numericality: {
                            onlyInteger: true,
                            greaterThan: 0
                        }
                    }
                }
            }
        }]);
        
        /**
         * A plain object of option definitons.
         * @private
         * @type {PlainObject}
         */
        this._options = args.options;
        
        /**
         * A plain object mapping data source names to data source objects.
         * @private
         * @type {PlainObject}
         */
        this._datasources = {};
    }
    
    /**
     * A read-only accessor for all the options.
     *
     * @param {string} optionName - the name of the option to get the value for
     * @returns {*} the option's value, or `undefined` if the option is not
     * defined.
     * @throws {external:validateParams.ValidationError} a validation error is
     * thrown if parameter validation fails.
     */
    option(){
        let args = validateParams.assert(arguments, [{
            vpopt_name: 'optionName',
            presence: true,
            hasTypeof: 'string'
        }]);
        return this._options[args.optionName];
    }
    
    /**
     * A read-only accessor for all registered datasources.
     *
     * @param {DatabridgeName} datasourceName - the name of the datasource to
     * get.
     * @returns {Datasource} a reference to the requested datasource
     * object, or `undefined` if there is no datasource registered with the
     * given name.
     * @throws {external:validateParams.ValidationError} a validation error is
     * thrown if parameter validation fails.
     */
    datasource(){
        let args = validateParams.assert(arguments, [
            validateParams.extendObject({ vpopt_name: 'datasourceName', presence: true }, vpCons.databridgeName)
        ]);
        if(validate.isDefined(this._datasources[args.datasourceName])){
            return this._datasources[args.datasourceName];
        }
        return undefined;
    }
    
    /**
     * A function for adding a data source to the bridge.
     *
     * As well as storing the datasource so it can be accessed by name via
     * the [.datasource()]{@link Databridge#datasource} function, and invoked
     * via the [.fetchDataPromise()]{@link Databridge#fetchDataPromise}
     * function, a shortcut function is also created to allow the data to be
     * fetched via a function created on the bridge object with the same name as
     * the datasource. I.e. the data can be fetched from a datasource with the
     * name `myDataSource` on a databridge object named `db` with
     * `db.myDataSource()`.
     *
     * @param {DatabridgeName} datasourceName - the name to register the
     * datasource with.
     * @param {Datasource} datasource
     * @returns {Databridge} a reference to self to facilitate function
     * chaining.
     * @throws {external:validateParams.ValidationError} a validation error is
     * thrown if parameter validation fails.
     * @see Databridge#fetchDataPromise
     */
    registerDatasource(){
        let args = validateParams.assert(arguments, [
			validateParams.extendObject({vpopt_name: 'datasourceName'}, vpCons.databridgeName),
			{
				vpopt_name: 'datasource',
				defined: true,
				isInstanceof: [Datasource]
			}
		]);
        let dsName = args.datasourceName;
        if(validate.isDefined(this._datasources[dsName])){
            throw new Error(`a datasource has already been registered with the name '${dsName}'`);
        }
        if(validate.isDefined(this[dsName])){
            throw new Error(`the datasource name '${args.datasource.name()}' cannot be used because it clashes with an existing function or property name`);
        }
        
        // save the datasource
        this._datasources[dsName] = args.datasource;
        
        // bind the shortcut function(s)
        let self = this;
		if(args.datasource.hasSingleDataFetcher()){
			let func = function(){
				return self.fetchDataPromise.bind(self, dsName, {});
			};
			this[dsName] = func();
		}else{
			this[dsName] = {}; // create an empty name-space to hold all the shortcuts
			let registerer = function(fnNS, n, np, df){
				if(validate.isFunction(df)){
					let nFunc = function(){
						return self.fetchDataPromise.bind(self, np, {});
					};
					fnNS[n] = nFunc();
				}else if(validateParams.isPlainObject(df)){
					fnNS[n] = {}; // create a new sub-namespace
					for(let nn in df){
						// BEWARE - recursion!
						registerer(fnNS[n], nn, [...np, nn], df[nn]);
					}
				}
			};
			let baseDF = args.datasource.dataFetcher();
			for(let dfName in baseDF){
				registerer(this[dsName], dfName, [dfName], baseDF[dfName]);
			}
		}
        
        // return a reference to self
        return this;
    }
    
    /**
     * A function to fetch data from a data source. The function returns an
     * object that contains a promise for the data.
     *
     * @param {(DatabridgeNamePath} datasourcePath - for datasources with
     * single data fetchers, the name of the data source as a string, for data
     * sources with multiple data fetchers, an array of strings with the name
     * of the datasource as the first element, and the path to the required
     * fetcher in the remaining elements.
     * @param {PlainObject} [options={}] - a plain object with options
     * @param {string} [options.streamName='main'] - for datasources that
     * access multiple streams of data, this option can be used to maintain
     * multiple caches, one for each stream.
     * @param {boolean} [options.bypassCache=false] - a truthy value will bypass
     * the cache, regardless of the data source's caching settings and TTL.
     * @param {Array} [fetcherArgs=[]] - an array of arguments to pass to the
     * fetcher function.
     * @returns {FetchResponse} a fetch response object containing
     * a promise that resolves to the data returned from the datasource.
     * @throws {external:validateParams.ValidationError} a validation error is
     * thrown if parameter validation fails.
     * @throws {Error} An error is thrown when an unregistered datasource name
     * is specified, or if there is a problem fetching data from the datasource.
     */
    fetchResponse(){
        let args = validateParams.assert(arguments, [
			{
				vpopt_name: 'datasourcePath',
				presence: true,
				namePath: true
			},
            {
                paramOptions: {
                    name: 'options',
                    defaultWhenUndefined: {},
                    coerce: function(v, o, c){
                        if(validate.isObject(v)){
                            if(!validate.isDefined(v.streamName)) v.streamName = 'main';
                            if(validate.isDefined(v.bypassCache)){
                                v.bypassCache = v.bypassCache ? true : false;
                            }else{
                                v.bypassCache = false;
                            }
                        }
                        return v;
                    }
                },
                dictionary: {
                    mapConstraints: {
                        streamName: {
                            hasTypeof: 'string',
                            length: {minimum: 1}
                        },
                        bypassCache: {
                            hasTypeof: 'boolean'
                        }
                    }
                }
            },
            {
                paramOptions: {
                    name: 'fetcherArgs',
                    defaultWhenUndefined: []
                },
                list: true
            }
        ]);
		let sourceName = validate.isString(args.datasourcePath) ? args.datasourcePath : args.datasourcePath[0];
		let sourcePath = validate.isString(args.datasourcePath) ? [args.datasourcePath] : args.datasourcePath;
        let streamName = args.options.streamName;
        
        // make sure the datasource exists
        let ds = this._datasources[sourceName];
        if(!ds){
            throw new Error(`no datasource registered with name '${sourceName}'`);
        }
        
        // build the arguments for the fetcher function
        let fetcherArgs = [];
        for(let i = 2; i < arguments.length; i++){
            fetcherArgs.push(arguments[i]);
        }
        
        // assemble a fetch request object
        let request = new FetchRequest(
            this,
            ds,
            args.options,
            args.fetcherArgs,
            moment().toISOString()
        );
        
        // assemble a fetch response object (details will be filled in later)
        let response = new FetchResponse(request, undefined, { cacheRead: false });
        
        // before calling the fetcher, check for a valid cached copy
        if(ds.option('enableCaching') && !args.options.bypassCache){
            let cache = this._getStreamCache(sourcePath, streamName);
            if(cache){
                // figure out which TTL applies
                let ttl = this.option('defaultCacheTTL'); // start with the default
                if(ds.option('cacheTTL')){
                    ttl = ds.option('cacheTTL'); // override with specified TTL
                }
                if(cache.isWithinTTL(ttl)){
                    // store the cached data into the response in a pre-resolved promise
                    response.dataPromise(Promise.resolve(cache.data()));
                    
                    // add the cache-related metadata into the response
                    response.meta('cacheRead', { path: cache.filePath(), timestamp: cache.timestamp() });
                    
                    // return the response object
                    return response;
                }
            }
        }
        
        // if no valid data was found in the cache, try initialise a request to the data source
        let dataPromise = false;
        try{
            dataPromise = ds.fetchDataPromise(fetcherArgs);
        }catch(err){
            throw new Error(`failed to fetch data from data source '${sourceName}' with error: ${err.message}`);
        }
        
        // if caching is enabled, set it to be attempted when the promised data is delivered
        let self = this;
        if(ds.option('enableCaching')){
            dataPromise = dataPromise.then(function(data){
                try{
                    let cacheFile = self._writeStreamCache(new DataCache(
                        sourcePath,
                        streamName,
                        moment().toISOString(),
                        data
                    ));
                    response.meta('cacheWrite', {path: path.resolve(cacheFile), timestamp: moment().toISOString()});
                }catch(err){
                    console.warn(`failed to cache data returned from datasource '${sourceName}' as stream '${streamName}'`, err); // TO DO - make error path-aware
                }
                return data;
            });
        }
        
        // add the data promise into the response object and return it
        response.dataPromise(dataPromise);
        return response;
    }
    
    /**
     * A function to fetch a promise of data from a data source.
     *
     * Note that this is simply a wrapper around
     * [.fetch()]{@link Databridge#fetch}.
     *
     * @param {DatabridgeNamePath} datasourcePath - for datasources with
     * single data fetchers, the name of the data source as a string, for data
     * sources with multiple data fetchers, an array of strings with the name
     * of the datasource as the first element, and the path to the required
     * fetcher in the remaining elements.
     * @param {PlainObject} [options={}] - a plain object with options
     * @param {string} [options.streamName='main'] - for datasources that
     * access multiple streams of data, this option can be used to maintain
     * multiple caches, one for each stream.
     * @param {Array} [fetcherArgs=[]] - an array of arguments to pass to the
     * fetcher function.
     * @returns {Promise} a promise that resolves to the data returned from the
     * datasource.
     * @throws {external:validateParams.ValidationError} a validation error is
     * thrown if parameter validation fails.
     * @throws {Error} An error is thrown when an unregistered datasource name
     * is specified, or if there is a problem fetching data from the datasource.
     * @see Databridge#fetch
     */
    fetchDataPromise(datasourcePath, options, fetcherArgs){
        return this.fetch(datasourcePath, options, fetcherArgs).dataPromise();
    }
    
    /**
     * A function to generate the file path for a given data cache.
     *
     * @private
     * @param {DatabridgeNamePath} sourcePath - path to the data fetcher within
     * the datasource the requested cache belongs to.
     * @param {DatabridgeName} streamName - the name of the data stream the
     * reqested cache belongs to.
     * @returns {string}
     * @throws {TypeError} A type error is thrown if an invalid source path is
     * passed.
     */
    _generateCachePath(sourcePath, streamName){
		let fileName = '';
		if(validate.isString(sourcePath)){
			fileName += sourcePath;
		}else if(validate.isArray(sourcePath)){
			fileName += sourcePath.join('.');
		}else{
			throw new TypeError('invalid source path passed');
		}
		fileName += '.' + streamName + '.json';
        return path.join(this.option('cacheDir'), fileName);
    }
    
    /**
     * A function to attempt to load data for a given datasource and stream from
     * cache.
     *
     * @private
     * @param {DatabridgeNamePath} sourcePath - path to the data fetcher within
     * the datasource the requested cache belongs to.
     * @param {DatabridgeName} streamName - the name of the data stream the
     * reqested cache belongs to.
     * @returns {DataCache} returns the cached data as a DataCache object, or
     * undefined.
     */
    _getStreamCache(sourcePath, streamName){
        let cachePath = this._generateCachePath(sourcePath, streamName);
        let cachedObj = fs.readJsonSync(cachePath, { throws: false });
        if(cachedObj){
            try{
                let loadedCache = DataCache.fromJsonObject(cachedObj);
                loadedCache.filePath(cachePath);
                return loadedCache;
            }catch(err){
                console.warn('failed to parse cached data', err);
            }
        }
        return undefined;
    }
    
    /**
     * A function to attempt to write data from a given datasource and stream to
     * a cache file.
     *
     * @private
     * @param {DataCache} cacheObj - the cache object to try write to disk.
     * @returns {string} returns the path to the cache file.
     * @throws {Error} throws an error if there is a problem writing the data to
     * disk.
     */
    _writeStreamCache(cacheObj){
        var cachePath = this._generateCachePath(cacheObj.sourcePath(), cacheObj.streamName());
        fs.writeJsonSync(cachePath, cacheObj.asJsonObject());
        return cachePath;
    }
}

/**
 * An alias for `.registerDatasource()`.
 * @function
 * @see Databridge.registerDatasource
 */   
Databridge.prototype.register = Databridge.prototype.registerDatasource;

/**
 * An alias for `.datasource()`.
 * @function
 * @see Databridge.datasource
 */   
Databridge.prototype.source = Databridge.prototype.datasource;

/**
 * An alias for `.fetchResponse()`.
 * @function
 * @see Databridge.fetchResponse
 */   
Databridge.prototype.fetch = Databridge.prototype.fetchResponse;

//
//=== Define the Datasource class ==============================================
//

/**
 * A class representing a data source from which the bridge can pull data.
 */
class Datasource{
    /**
     * @param {DataFetcher} [dataFetcher={}] - the callback, or collection of
     * callbacks, which the datasource will use to fetch data.
     * @param {PlainObject} [options] - a plain object defining options.
     * @param {boolean} [options.enableCaching=true] - whether or not to cache
     * the results returned by this data source. By default, caching is enabled.
     * @param {number} [options.cacheTTL] - the TTL for the data cache
     * in seconds.
     * @throws {external:validateParams.ValidationError} a validation error is
     * thrown if parameter validation fails.
     */
    constructor(){
        let args=validateParams.assert(arguments, [
            {
				paramOptions: {
					name: 'dataFetcher',
					defaultWhenUndefined: {}
				},
                dataFetcher: true
            },
            {
                paramOptions: {
                    name: 'options',
                    defaultWhenUndefined: {},
                    coerce: function(v, o, c){
                        if(validate.isObject(v)){
                            if(typeof v.enableCaching === 'undefined'){
                                v.enableCaching = true;
                            }else{
                                v.enableCaching = validateParams.coercions.toBoolean(v.enableCaching, o, c);
                            }
                        }
                        return v;
                    }
                },
                dictionary: {
                    mapConstraints: {
                        enableCaching: {
                            defined: true,
                            hasTypeof: 'boolean'
                        },
                        cacheTTL: {
                            hasTypeof: 'number',
                            numericality: {
                                onlyInteger: true,
                                greaterThan: 0
                            }
                        }
                    }
                }
            }
        ]);
        
        /**
         * The data fetcher definition for this data source defining zero or
         * more data fetcher callbacks.
         * @private
         * @type {DataFetcher}
         */
        this._dataFetcher = args.dataFetcher;
        
        /**
         * Options for this data source.
         * @private
         * @type {PlainObject}
         */
        this._options = args.options;
    }
    
    /**
     * A read-only accessor for fetcher callbacks. If there's only one callback
     * associated with this source then it will be returned, regardless of the
     * parameters passed. If there are multiple nested callbacks, then,
     * depending on the parameters passed, either a callback or a plain object
     * containing multiple callbacks will be returned.
     * @param {(...DatabridgeName|DatabridgeName[])} [callbackPath] - if
     * paramters are passed, they will be interpreted as paths within the data
     * fetchers data structure.
     * @returns {(function|PlainObject)}
     * @throws {TypeError} A type error is thrown if parameters are present,
     * but not valid.
     * @throws {Error} An error is thrown if a non-existent data fetcher is
     * requested.
     */
    dataFetcher(){
		// process arguments manually because validateParams can't support
		// repeated parameters at the time of writting
		let pathElements = validate.isArray(arguments[0]) ? arguments[0] : Array.from(arguments);
		for(let path of pathElements){
			if(validate.single(path, vpCons.databridgeName)){
				throw new TypeError("parameter passed that's not a valid databridge name");
			}
		}
		
		// return the requested value
		let ans = this._dataFetcher;
		while(pathElements.length > 0){
			let pathElement = pathElements.shift();
			if(validate.isDefined(ans[pathElement])){
				ans = ans[pathElement];
			}else{
				throw new Error('non-existent data fetcher requested');
			}
		}
        return ans;
    }
	
	/**
	 * A utility function to determine whether or not a given datasource has a
	 * simple sigle data fetcher callback, or, supports multiple data fetchers.
	 * I.e. true if `.dataFetcher()` returns a callback, and false if it
	 * returns a plain object, even if that plain object only contains a single
	 * callback.
	 * @returns {boolean}
	 */
	hasSingleDataFetcher(){
		return validate.isFunction(this._dataFetcher);
	}
    
    /**
     * A read-only accessor for all the options.
     *
     * @param {string} optionName - the name of the option to get the value for
     * @returns {*} the option's value, or `undefined` if the option is not
     * defined.
     * @throws {external:validateParams.ValidationError} a validation error is
     * thrown if parameter validation fails.
     * @throws {Error} an error if execution of the fetcher fails.
     */
    option(){
        let args = validateParams.assert(arguments, [{
            vpopt_name: 'optionName',
            presence: true,
            hasTypeof: 'string'
        }]);
        return this._options[args.optionName];
    }
    
    /**
     * A function to execute the dataFetcher callback and return a promise for
     * the data it will produce.
     * 
     * @params {Array} [fetcherArgs=[]] - the arguments to pass to the fetcher
     * functions as an array.
     * @returns {Promise}
     */
    fetchDataPromise(){
        let args = validateParams.assert(arguments, [{
            paramOptions: {
                name: 'fetcherArgs',
                defaultWhenUndefined: []
            },
            list: true
        }]);
        
        // try invoke the fetcher
        let response = false;
        try{
            response = this.dataFetcher().apply(this, args.fetcherArgs);
        }catch(err){
            throw new Error(`failed to execute fetcher for datasource '${this.name()}' with error: ${err.message}`);
        }
        
        // return a promise of the data
        return validate.isPromise(response) ? response : Promise.resolve(response);
    }
}

//
//=== Define the FetchRequest class ============================================
//

/**
 * A class representing a request to fetch data from a datasource.
 */
class FetchRequest{
    /**
     * @param {Databridge} bridge - a reference to the databridge the request
     * was submitted to.
     * @param {Datasource} source - the datasource the request was
     * submitted on.
     * @param {Object} fetchOptions - the options passed to the databridge when
     * initiating the request.
     * @param {Array} fetcherParams - the parameters for the fetcher function.
     * @param {ISO8601} timestamp - the time the request was submitted to the
     * databridge at as an ISO8601 string.
     * @throws {external:validateParams.ValidationError} a validation error is
     * thrown if parameter validation fails.
     */
    constructor(){
        let args = validateParams.a(arguments, [
            {
                vpopt_name: 'bridge',
                defined: true,
                isInstanceof: [Databridge]
            },
            {
                vpopt_name: 'source',
                defined: true,
                isInstanceOf: [Datasource]
            },
            {
                vpopt_name: 'fetchOptions',
                defined: true,
                dictionary: true
            },
            {
                vpopt_name: 'fetcherParams',
                defined: true,
                list: true
            },
            {
                vpopt_name: 'timestamp',
                presence: true,
                iso8601: true
            }
        ]);
        
        /**
         * The Databridge object that initiated the request.
         * @private
         * @type {Databridge}
         */
        this._bridge = args.bridge;
        
        /**
         * The Datasource object the request was initiated on.
         * @private
         * @type {Datasource}
         */
        this._source = args.source;
        
        /**
         * The options passed to the databridge's fetch function that initiated
         * the request.
         * @private
         * @type {Object}
         */
        this._fetchOptions = args.fetchOptions;
        
        /**
         * The parameters passed to the datasource's fetcher callback.
         * @private
         * @type {Array}
         */
        this._fetcherParams = args.fetcherParams;
        
        /**
         * The time the request was submitted to the bridge at.
         * @private
         * @type {ISO8601}
         */
        this._timestamp = args.timestamp;
    }
    
    /**
     * A read-only accessor for a reference to the databridge the request was
     * submitted to.
     * @returns {Databridge}
     */
    databridge(){
        return this._bridge;
    }
    
    /**
     * A read-only accessor for a reference to the datasource the request was
     * submitted to.
     * @returns {Datasource}
     */
    datasource(){
        return this._source;
    }
    
    /**
     * A read-only accessor for a reference to the options passed to the
     * databridge's fetch function.
     * @returns {Object}
     */
    fetchOptions(){
        return this._fetchOptions;
    }
    
    /**
     * A read-only accessor for a reference to the parameters passed to the
     * data fetcher callback.
     * @returns {Array}
     */
    fetcherParams(){
        return this._fetcherParams;
    }
    
    /**
     * A read-only accessor for the time the request was made at as an ISO8601
     * string.
     * @returns {ISO8601}
     */
    timestamp(){
        return this._timestamp;
    }
}

/**
 * An alias for `.databridge()`.
 * @returns {Databridge}
 * @see {FetchRequest#databridge}
 */
FetchRequest.prototype.bridge = FetchRequest.prototype.databridge;

/**
 * An alias for `.datasource()`.
 * @returns {Datasource}
 * @see {FetchRequest#datasource}
 */
FetchRequest.prototype.source = FetchRequest.prototype.datasource;

/**
 * An alias for `.fetchOptions()`.
 * @returns {Object}
 * @see {FetchRequest#fetchOptions}
 */
FetchRequest.prototype.options = FetchRequest.prototype.fetchOptions;

/**
 * An alias for `.fetcherParams()`.
 * @returns {Array}
 * @see {FetchRequest#fetcherParams}
 */
FetchRequest.prototype.params = FetchRequest.prototype.fetcherParams;

//
//=== Define the FetchResponse class ===========================================
//

/**
 * A class representing both data returned from a request to a datasource, and
 * its matching metadata.
 */
class FetchResponse{
    /**
     * @param {FetchRequest} request - A reference to the data fetch
     * request object this response answers.
     * @param {Objet} [meta] - an object contaning metadata
     * @throws {external:validateParams.ValidationError} a validation error is
     * thrown if parameter validation fails.
     */
    constructor(){
        let args = validateParams.a(arguments, [
            {
                vpopt_name: 'request',
                defined: true,
                isInstanceof: [FetchRequest]
            },
            {
                paramOptions: {
                    name: 'meta',
                    defaultWhenUndefined: {}
                },
                defined: true,
                dictionary: true
            }
        ]);
        
        /**
         * The request this response is a reply to.
         * @private
         * @type {FetchRequest}
         */
        this._request = args.request;
        
        /**
         * A promise of the data returned from the datasource.
         * @private
         * @type {Promise}
         */
        this._dataPromise = undefined;
        
        /**
         * The metadata associated with this response
         * @private
         * @type {Object}
         */
        this._meta = args.meta;
    }
    
    /**
     * A read-only accessor for the request this response is related to.
     * @returns {FetchRequest}
     */
    request(){
        return this._request;
    }
    
    /**
     * A read/write accessor for the promise of the data associated with this
     * response.
     * @param {Promise} [dataPromise] - if present, this function will behave as
     * a setter.
     * @returns {Promise} Regardless of whether or not a new promise was passed,
     * if there is a current data promise it will be returned, otherwise,
     * `undefined` will be returned.
     * @throws {TypeError} a type error is thrown if a parameter is passed and
     * it's not a promise.
     */
    dataPromise(dataPromise){
        if(validate.isDefined(dataPromise) && !validate.isPromise(dataPromise)){
            throw new TypeError('if present, the first parameter must be a promise');
        }
        
        // set if needed
        if(arguments.length >= 1){
            this._dataPromise = dataPromise;
        }
        
        // return current value
        return this._dataPromise;
    }
    
    /**
     * A read/write accessor for individual pieces of metadata associated with
     * this response.
     * @param {string} metaName - the name of desired piece of metadata.
     * @param {*} [newVal] - if present, will set the value of the requested
     * piece of metadata to this value.
     * @returns - always returns the current value for a given metadata name,
     * which could be `undefined`.
     * @throws {external:validateParams.ValidationError} a validation error is
     * thrown if parameter validation fails.
     */
    meta(){
        let args = validateParams.a(arguments, [
            {
                vpopt_name: 'metaName',
                presence: true,
                hasTypeof: 'string'
            },
            {
                vpopt_name: 'newVal'
            }
        ]);
        
        // set of needed
        if(arguments.length >= 2){
            this._meta[args.metaName] = args.newVal;
        }
        
        // always return
        return this._meta[args.metaName];
    }
    
    /**
     * A read-only accessor method to get all metadata. A shallow copy is
     * returned.
     * @returns {Object}
     * @see external:validateParams.shallowCopy
     */
    allMeta(){
        return validateParams.shallowCopy(this._meta);
    }
}

//
//=== Define the Private (not exported) DataCache class ========================
//

/**
 * A private class to represent cached data.
 * 
 * @private
 */
class DataCache{
    /**
     * @param {DatabridgeNamePath} sourcePath
     * @param {DatabridgeName} streamName
     * @param {ISO8601} timestamp
     * @param {PlainObject} data
     * @param {string} [filePath]
     * @throws {external:validateParams.ValidationError} a validation error is
     * thrown if parameter validation fails.
     */
    constructor(){
        let args = validateParams.assert(arguments, [
			{
				vpopt_name: 'sourcePath',
				presence: true,
				namePath: true
			},
            validateParams.extendObject({ vpopt_name: 'streamName', presence: true }, vpCons.databridgeName),
            {
                vpopt_name: 'timestamp',
                iso8601: true,
                presence: true
            },
            {
                vpopt_name: 'data',
                defined: true
            },
            {
                vpopt_name: 'filePath',
                hasTypeof: 'string'
            }
        ]);
        
        /**
         * The name of the datasource the cached data belongs to.
         * @type {DatabridgeName}
         */
        this._datasourceName = validate.isString(args.sourcePath) ? args.sourcePath : args.sourcePath[0];
		
		/**
		 * The path to the fetcher within the datasource the cached data
		 * belongs to.
		 * @type {DatabridgeName[]}
		 */
		this._dataFetcherPath = [];
		if(validate.isArray(args.sourcePath)){
			for(let i = 1; i < args.sourcePath.length; i++){
				this._dateFetcherPath.push(args.sourcePath[i]);
			}
		}
        
        /**
         * The name of the datastream within the datasource the cached data
         * belongs to.
         * @type {DatabridgeName}
         */
        this._datastreamName = args.streamName;
        
        /**
         * The time the data was cached at.
         * @type {ISO8601}
         */
        this._timestamp = args.timestamp;
        
        /**
         * The data to be cached.
         * @type {*}
         */
        this._data = args.data;
        
        /**
         * The path to the JSON file for the cache on disk.
         * @type {string}
         */
        this._filePath = '';
        if(!validate.isEmpty(args.filePath)){
            this._filePath = args.filePath;
        }
    }
    
    /**
     * A read-only accessor for the datasource name.
     * @returns {DatabridgeName}
     */
    datasourceName(){
        return this._datasourceName;
    }
    
    /**
     * A read-only accessor for the datasource name.
     * @returns {DatabridgeName}
     */
    sourceName(){
        return this._datasourceName;
    }
	
	/**
	 * A read-only accessor for the data fetcher path.
	 * @returns {DatabridgeName[]}
	 */
	dataFetcherPath(){
		return this._dataFetcherPath;
	}
	
	/**
	 * A read-only accessor for the data fetcher path.
	 * @returns {DatabridgeName[]}
	 */
	fetcherPath(){
		return this._dataFetcherPath;
	}
	
	/**
	 * A utility function to return the full path to the data fetcher (source
	 * name and fetcher path).
	 * @returns {DatabridgeName[]}
	 */
	datasourcePath(){
		return [this._datasourceName, ...this._dataFetcherPath];
	}
    
    /**
     * A read-only accessor for the datastream name.
     * @returns {DatabridgeName}
     */
    datastreamName(){
        return this._datastreamName;
    }
    
    /**
     * A read-only accessor for the datastream name.
     * @returns {DatabridgeName}
     */
    streamName(){
        return this._datastreamName;
    }
    
    /**
     * A read-only accessor for the cache's timestamp.
     * @returns {ISO8601}
     */
    timestamp(){
        return this._timestamp;
    }
    
    /**
     * A read-only accessfor for the cache's data.
     * @returns {*}
     */
    data(){
        return this._data;
    }
    
    /**
     * A read & write accessor for the cache file path.
     * @returns {string}
     * @throws {valdiateParams.ValidationError} throws a validation error if
     * passed invalid parameters.
     */
    filePath(){
        let args = validateParams.assert(arguments, [{
            vpopt_name: 'filePath',
            hasTypeof: 'string'
        }]);
        
        // set if appropriate
        if(arguments.length >= 1){
            this._filePath = validate.isEmpty(args.filePath) ? '' : args.filePath;
        }
        
        // always return the current value
        return this._filePath;
    }
    
    /**
     * An instance function to check if the cached data is still valid for a
     * given TTL.
     *
     * @param {number} ttl - a TTL in minutes.
     * @returns {boolean}
     */
    isWithinTTL(ttl){
        var now = moment();
        var cachedAt = moment(this.timestamp());
        
        // if the cached date is in the future, return false
        if(cachedAt.isAfter(now)) return false;
        
        // get the age of the cache in minutes
        var ageMin = Math.abs(now.diff(cachedAt, 'minutes'));
        
        // return as appropriate
        return ageMin <= ttl ? true : false;
    }
    
    /**
     * A function to return a plain object representing the cache data for
     * serialisation to disk.
     *
     * @returns {PlainObject}
     */
    asJsonObject(){
        return {
            datasourceName: this.sourceName(),
			dataFetcherPath: this.fetcherPath(),
            datastreamName: this.streamName(),
            timestamp: this.timestamp(),
            data: this.data()
        };
    }
}

/**
 * An alias for `.datasourcePath()`.
 * @see DataCache#datasourcePath
 */
DataCache.prototype.sourcePath = DataCache.prototype.datasourcePath;

/**
 * An alias for `.filePath()`.
 * @see DataCache#filePath
 */
DataCache.prototype.path = DataCache.prototype.filePath;

/**
 * A static factory method to build a cache object from JSON data read from a
 * cache file on disk.
 * 
 * @param {PlainObject} cacheObj - the JSON data loaded from a cache on disk.
 * @param {string} cacheObj.datasourceName
 * @param {string[]} cacheObj.dataFetcherPath
 * @param {string} cacheObj.datastreamName
 * @param {string} cacheObj.timestamp
 * @param {*} cacheObj.data
 * @throws {external:validateParams.ValidationError} a validation error is
 * thrown if parameter validation fails.
 */
DataCache.fromJsonObject = function(){
    let args = validateParams.assert(arguments, [{
        vpopt_name: 'cacheObj',
        defined: true,
        dictionary: {
            mapConstraints: {
                datasourceName: { presence: true, hasTypeof: 'string' },
				dataFetcherPath: {
					defined: true,
					list: { valueConstraints: { hasTypeof: 'string' } }
				},
                datastreamName: { presence: true, hasTypeof: 'string' },
                timestamp: { presence: true, iso8601: true },
                data: { defined: true }
            }
        }
    }]);
    return new DataCache(
        [args.cacheObj.datasourceName, ...args.cacheObj.dataFetcherPath],
        args.cacheObj.datastreamName,
        args.cacheObj.timestamp,
        args.cacheObj.data
    );
}

//
//=== Export the public classes as the module ==================================
//

module.exports = {
    Databridge: Databridge,
    Datasource: Datasource,
    FetchRequest: FetchRequest,
    FetchResponse: FetchResponse
};
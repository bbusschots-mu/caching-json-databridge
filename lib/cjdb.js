/**
 * @file Provides the NodeJS module
 * [caching-json-databridge]{@link module:@maynoothuniversity/caching-json-databridge}. The
 * module is exported as the JavaScript prototype/class
 * [Databridge]{@link module:@maynoothuniversity/caching-json-databridge~Databridge}.
 * @author Bart Busschots <Bart.Busschots@mu.ie>
 * @version 0.0.1
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
 * This module exports the
 * [Databridge]{@link module:@maynoothuniversity/caching-json-databridge~Databridge}
 * class.
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
 * A valid name for databridge resources like sources and streams. Specifically,
 * a string of three or more characters starting with a letter and containing
 * only letters, digits, and underscores.
 * @typedef {string} DatabridgeName
 */

/**
 * A valid ISO8601 date string.
 * @typedef {string} ISO8601
 * @see {@link https://en.wikipedia.org/wiki/ISO_8601}
 */

//
//--- JSDoc Callback Definitions -----------------------------------------------
//

/**
 * A data fetcher callback should fetch the data for a given data source, and
 * return it in the form of a plain object that can be serialised to a JSON
 * string.
 * @callback DataFetcherCallback
 * @returns {PlainObject} must return a plain object that can be serialised as a
 * JSON string.
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
        if(validate.isString(val) && fs.statSync(val).isDirectory()){
            return undefined; // all is well
        }
        return validateParams.extractValidatorMessage(this, opts) || 'is not a valid file path to a folder';
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
     * the folder to use for caching.
     * @param {number} [options.defaultCacheTTL=3600] - the default time to live
     * for cached data in seconds.
     */
    constructor(){
        let args = validateParams.assert(arguments, [{
            paramOptions: {
                name: 'options',
                defaultWhenUndefined: {},
                coerce: function(v, o , c){
                    if(validate.isObject(v)){
                        if(typeof v.cacheDir === 'undefined') v.cacheDir = './databridgeJsonCache';
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
         * A plain object of option definitions.
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
     * @throws {Error} An error is thrown if a datasource is already registered
     * with the given name.
     * @throws {Error} An error is thrown if a datasource name clashes with a
     * function provided by the `Databridge` prototype.
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
     * A function for adding a data source to the bridge.
     *
     * @param {Databridge.Datasource} datasource
     * @returns {Databridge} a reference to self to facilitate function chaining.
     */
    registerDatasource(){
        let args = validateParams.assert(arguments, [{
            vpopt_name: 'datasource',
            defined: true,
            isInstanceof: [Datasource]
        }]);
        var dsName = args.datasource.name();
        if(validate.isDefined(this._datasources[dsName])){
            throw new Error(`a datasource has already been registered with the name '${dsName}'`);
        }
        if(validate.isDefined(this[args.datasource.name()])){
            throw new Error(`the datasource name '${args.datasource.name()}' cannot be used because it clashes with an existing function or property name`);
        }
        
        // save the datasource
        this._datasources[args.datasource.name()] = args.datasource;
        
        // bind the shortcut function
        // TO DO
        
        // return a reference to self
        return this;
    }
    
    /**
     * A function to fetch data from a data source.
     *
     * @param {DatabridgeName} datasourceName - the name of the data source to
     * fetch the data with
     * @param {PlainObject} [options={}] - a plain object with options
     * @param {string} [options.streamName='main'] - for datasources that
     * access multiple streams of data, this option can be used to maintain
     * multiple caches, one for each stream.
     * @param {Array} [fetcherArgs=[]] - an array of arguments to pass to the
     * fetcher function.
     * @returns {Promise} a promise.
     * @throws {Error} An error is thrown when an unregistered datasource name
     * is specified.
     */
    fetch(){
        let args = validateParams.assert(arguments, [
            validateParams.extendObject({ vpopt_name: 'datasourceName', presence: true }, vpCons.databridgeName),
            {
                paramOptions: {
                    name: 'options',
                    defaultWhenUndefined: {},
                    coerce: function(v, o, c){
                        if(validate.isObject(v)){
                            if(!validate.isDefined(v.streamName)) v.streamName = 'main';
                        }
                        return v;
                    }
                },
                dictionary: {
                    mapConstraints: {
                        streamName: {
                            hasTypeof: 'string',
                            length: {minimum: 1}
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
        
        // make sure the datasource exists
        let ds = this._datasources[args.datasourceName];
        if(!ds){
            throw new Error(`no datasource registered with name '${args.datasourceName}'`);
        }
        
        // build the arguments for the fetcher function
        let fetcherArgs = [];
        for(let i = 2; i < arguments.length; i++){
            fetcherArgs.push(arguments[i]);
        }
        
        // before calling the fetcher, check for a valid cached copy
        if(ds.option('enableCaching')){
            // LEFT OFF HERE
        }
        
    }
    
    /**
     * A function to attempt to load data for a given datasource and stream from
     * cache.
     *
     * @private
     * @param {DatabridgeName} sourceName - the name of the datasource the
     * requested cache belongs to.
     * @param {DatabridgeName} streamName - the name of the data stream the
     * reqested cache belongs to.
     */
    _getStreamCache(sourceName, streamName){
        let cachedObj = fs.readJsonSync(this._generateCachePath(sourceName, streamName), { throws: false });
        if(cachedObj){
            // LEFT OFF HERE
        }
        return undefined;
    }
    
    /**
     * A function to generate the file path for a given data cache.
     *
     * @private
     * @param {DatabridgeName} sourceName - the name of the datasource the
     * requested cache belongs to.
     * @param {DatabridgeName} streamName - the name of the data stream the
     * reqested cache belongs to.
     * @returns {string}
     */
    _generateCachePath(sourceName, streamName){
        return this.option('cacheDir') + sourceName + '.' + streamName + '.json';
    }
}

//
//=== Define the DataSource class ==============================================
//

/**
 * A class representing a data source from which the bridge can pull data.
 *
 * @name Databridge.Datasource
 */
class Datasource{
    /**
     * @param {DatabridgeName} name - the name for the data source.
     * @param {DataFetcherCallback} dataFetcher - a function which fetches the data
     * for this data source. This function must return a plain JavaScript object
     * that can be serialised to a JSON string.
     * @param {PlainObject} [options] - a plain object defining options.
     * @param {boolean} [options.enableCaching=true] - whether or not to cache
     * the results returned by this data source. By default, caching is enabled.
     * @param {number} [options.cacheTTL] - the TTL for the data cache
     * in seconds.
     */
    constructor(){
        let args=validateParams.assert(arguments, [
            validateParams.extendObject({ vpopt_name: 'name', presence: true }, vpCons.databridgeName),
            {
                vpopt_name: 'dataFetcher',
                defined: true,
                hasTypeof: 'function'
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
         * The data source's name.
         * @private
         * @type {DatabridgeName}
         */
        this._name = args.name;
        
        /**
         * The callback to fetch data from this data source.
         * @private
         * @type {DataFetcherCallback}
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
     * A read-only accessor for the datasource's name.
     *
     * @returns {DatabridgeName}
     */
    name(){
        return this._name;
    }
    
    /**
     * A read-only accessor for the data fetcher callback.
     *
     * @returns {function}
     */
    dataFetcher(){
        return this._dataFetcher;
    }
    
    /**
     * A read-only accessor for all the options.
     *
     * @param {string} optionName - the name of the option to get the value for
     * @returns {*} the option's value, or `undefined` if the option is not
     * defined.
     */
    option(){
        let args = validateParams.assert(arguments, [{
            vpopt_name: 'optionName',
            presence: true,
            hasTypeof: 'string'
        }]);
        return this._options[args.optionName];
    }
}
Databridge.Datasource = Datasource;

//
//=== Define the Private DataCache class =======================================
//

/**
 * A private class to represent cached data.
 * 
 * @private
 */
class DataCache{
    /**
     * @param {DatabridgeName} sourceName
     * @param {DatabridgeName} streamName
     * @param {ISO8601} timestamp
     * @param {PlainObject} data
     */
    constructor(){
        let args = validateParams.assert(arguments, [
            validateParams.extendObject({ vpopt_name: 'sourceName', presence: true }, vpCons.databridgeName),
            validateParams.extendObject({ vpopt_name: 'streamName', presence: true }, vpCons.databridgeName),
            {
                vpopt_name: 'timestamp',
                iso8601: true,
                presence: true
            },
            {
                vpopt_name: 'data',
                dictionary: true,
                defined: true
            },
        ]);
        
        // LEFT OFF HERE
    }
}

//
//=== Export the Databridge class as the module ================================
//
module.exports = Databridge;
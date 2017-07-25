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
 * A valid data source name - specifically, a string of three or more characters
 * starting with a letter and containing only letters, digits, and underscores.
 * @typedef {string} DatasourceName
 */

//
//--- JSDoc Callback Definitions -----------------------------------------------
//

/**
 * A data fetcer callback should fetch the data for a given data source, and
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
     * A constraint to enforce the {@link DatasourceName} type.
     */
    datasourceName: {
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
    folderExists: function(val){
        if(validate.isEmpty(val)){
            return undefined; // implicitly pass empty values
        }
        if(validate.isString(val) && fs.statSync(val).isDirectory()){
            return undefined; // all is well
        }
        return validateParams.extractValidatorMessage(this, opts) || 'is not a valid file path to a folder';
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
        this._dataSources = {};
    }
}

//
//=== Define the DataSource class ==============================================
//

/**
 * A class representing a data source from which the bridge can pull data.
 */
class Datasource{
    /**
     * @param {DatasourceName} name - the name for the data source.
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
            validateParams.extendObject({ vpopt_name: 'name', presence: true }, vpCons.datasourceName),
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
         * @type {DatasourceName}
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
}
Databridge.Datasource = Datasource;

//
//=== Export the Databridge class as the module ================================
//
module.exports = Databridge;
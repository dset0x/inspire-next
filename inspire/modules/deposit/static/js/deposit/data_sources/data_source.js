/*
 * This file is part of INSPIRE.
 * Copyright (C) 2014 CERN.
 *
 * INSPIRE is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * INSPIRE is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with INSPIRE. If not, see <http://www.gnu.org/licenses/>.
 *
 * In applying this licence, CERN does not waive the privileges and immunities
 * granted to it by virtue of its status as an Intergovernmental Organization
 * or submit itself to any jurisdiction.
 */

function DataSource(options) {

  if (!options.name || !options.id) {
    throw "ImportSource: improper initialization"
  }

  /**
   * Source name used as an internal identifier.
   *
   * @type {String}
   */
  this.id = options.id;

  /**
   * User-friendly source name used to put inside status messages.
   *
   * @type {String}
   */
  this.name = options.name;

  /**
   * Query url.
   *
   * @type {String}
   */
  this.url = options.url;

  /**
   * DataMapper to map the query result to field ids of the form.
   *
   * @type {DataMapper}
   */
  this.mapper = options.mapper;
}

DataSource.prototype = {
  /**
   * Imports data using given mapper.
   *
   * @returns {Deferred} an object needed for tasks synchronization
   */
  runGetData: function(id, depositionType) {
    var that = this;

    function processQuery(data) {

      var queryStatus = data.query ?
        data.query.status : data.status + ' ' + data.statusText;

      if (queryStatus === 'success' && data.source === 'database') {
        queryStatus = 'duplicated';
      }

      var queryMessage = that.getImportMessage(queryStatus, id);

      if (queryStatus !== 'success') {
        return {
          statusMessage: queryMessage
        };
      }

      // do the import
      var mapping = that.mapper.map(data.query, depositionType);

      return {
        mapping: mapping,
        statusMessage: queryMessage
      };
    }

    return $.ajax({
      url: this.url + id
    }).then(processQuery, function onError(data) {
      return {
        statusMessage: {
          state: 'danger',
          message: 'Import from ' + that.name + ': ' +
            data.status + ' ' + data.statusText
        }
      };
    });
  },

  /**
   * Generates the import status message.
   * @param queryStatus
   * @param idType DOI/arXiv/ISBN etc.
   * @param id
   * @returns {{state: string, message: string}} as in the input of
   *  tpl_flash_message template
   */
  getImportMessage: function(queryStatus, id) {
    if (queryStatus === 'notfound') {
      return {
        state: 'warning',
        message: 'The ' + this.name + ' ' + id + ' was not found.'
      };
    }
    if(queryStatus === 'malformed') {
      return {
        state: 'warning',
        message: 'The ' + this.name + ' ' + id + ' is malformed.'
      };
    }
    if (queryStatus === 'success') {
      return {
        state: 'success',
        message: 'The data was successfully imported from ' + this.name + '.'
      };
    }
    if (queryStatus === 'duplicated') {
      return {
        state: 'info',
        message: 'This ' + this.name + ' already exists in Inspire database.'
      };
    }

    return {
      state: 'warning',
      message: 'Unknown import result.'
    };
  }
}
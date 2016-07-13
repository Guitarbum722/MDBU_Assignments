/*
  Copyright (c) 2008 - 2016 MongoDB, Inc. <http://mongodb.com>

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/


var MongoClient = require('mongodb').MongoClient,
    assert = require('assert');


function ItemDAO(database) {
    "use strict";

    this.db = database;

    this.getCategories = function(callback) {
        "use strict";

        var aggregation =       [
                                    { 
                                        $group: { 
                                            _id: "$category",
                                            num: { $sum: 1 }
                                        }
                                    },
                                    {
                                        $sort: {
                                             _id: 1
                                        }
                                    }
                                ];
        var categories = [];
        var total = 0;
        this.db.collection( "item").aggregate( aggregation).toArray(function(err, docs){

            docs.forEach( function(doc) {
                categories.push( doc);
                total += doc.num;
            });
            categories.push( { _id: "All", num: total } );
            callback( categories);
        });        
    }


    this.getItems = function( category, page, itemsPerPage, callback) {
        "use strict";

        var skipNum = page === 0 ? 0 : ( page) * itemsPerPage;

        var tempAggregation =   [
                                    { $match: { "category": category} },
                                    { $sort: { _id: 1 } },
                                    { $skip: skipNum },
                                    { $limit: itemsPerPage }
                                ];
        var aggregation = [];

        if( category === "All") {

            aggregation =   [
                                { $sort: { _id: 1 } },
                                { $skip: skipNum },
                                { $limit: itemsPerPage }
                            ];
        } else {

            aggregation = tempAggregation;
        }

        var pageItems = [];

        this.db.collection( "item").aggregate( aggregation).toArray(function(err, documents){

            documents.forEach(function(doc) {

                pageItems.push( doc);
            });
            callback( pageItems);
        });
    }


    this.getNumItems = function( category, callback) {
        "use strict";

        var numItems = 0;

        var aggregation =   [
                                { $match: { "category": category } },
                                { 
                                    $group: {
                                        _id: "$category",
                                        num: { $sum: 1 }
                                    }
                                }
                            ];
        if( category === "All") {

            aggregation = [
                              { $match: {} },
                              { 
                                  $group: {
                                      _id: null,
                                      num: { $sum: 1 }
                                  }
                              }
                          ];
        }

        this.db.collection( "item").aggregate( aggregation).toArray(function(err, documents){

            documents.forEach( function(doc){

                numItems = doc.num;
            }); 
            callback( numItems);
        });       
    }


    this.searchItems = function( query, page, itemsPerPage, callback) {
        "use strict";

        var skipNum = page === 0 ? 0 : ( page) * itemsPerPage;

        var aggregation =   [
                                { $match: { $text: { $search: query } } },
                                { $sort: { _id: 1 } },
                                { $skip: skipNum },
                                { $limit: itemsPerPage }
                            ]

        this.db.collection( "item").aggregate( aggregation).toArray( function( err, documents){

            var items = [];
            documents.forEach( function( doc) {

                items.push( doc);
            });

            callback( items); 
        });  
    }


    this.getNumSearchItems = function(query, callback) {
        "use strict";

        var numItems = 0;

        var aggregation =   [
                               { $match:  { $text: { $search: query } } },
                               { $group: { _id: null, total: { $sum: 1 } } }
                            ];

        this.db.collection( "item").aggregate( aggregation).toArray( function( err, documents){


            documents.forEach( function( doc) {

                numItems = doc.total;                
            }); 

            callback( numItems);
        });
    }


    this.getItem = function(itemId, callback) {
        "use strict";

         var item = {};
         this.db.collection( "item").findOne( { _id: itemId}, function(err, document) {

            item = document;
            callback( item);
         });
    }


    this.getRelatedItems = function(callback) {
        "use strict";

        this.db.collection("item").find({})
            .limit(4)
            .toArray(function(err, relatedItems) {
                assert.equal(null, err);
                callback(relatedItems);
            });
    };


    this.addReview = function(itemId, comment, name, stars, callback) {
        "use strict";

        var reviewDoc = {
            name: name,
            comment: comment,
            stars: stars,
            date: Date.now()
        }
        var updateDoc = {
             $push: { reviews: reviewDoc }
        }

        this.db.collection( "item").updateOne( { _id: itemId }, updateDoc, function( err, doc) {


            callback( doc);
        });
    }


    this.createDummyItem = function() {
        "use strict";

        var item = {
            _id: 1,
            title: "Gray Hooded Sweatshirt",
            description: "The top hooded sweatshirt we offer",
            slogan: "Made of 100% cotton",
            stars: 0,
            category: "Apparel",
            img_url: "/img/products/hoodie.jpg",
            price: 29.99,
            reviews: []
        };

        return item;
    }
}


module.exports.ItemDAO = ItemDAO;

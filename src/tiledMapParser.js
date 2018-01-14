var TiledMap = require('./TiledMap');
var Tileset = require('./Tileset');
var Layer = require('./Layer');
var Tile = require('./Tile');
var path = require('path');
var util = require('./util');



module.exports = function() {

    /**
     * find the texture for a given tile from the array of tilesets
     */
    function findTilesetAndTexture(gid, tilesets)
    {
        var tileset, i, ix;

        // go backwards through the tilesets
        // find the first tileset with the firstGID lower that the one we want
        for ( i = tilesets.length - 1; i >= 0; i-- ) {
            tileset = tilesets[i];
            if(tileset.firstGID <= gid) { break; }
        }

        // calculate the internal position within the tileset
        ix = gid - tileset.firstGID;

		return {"tileset": tileset, "texture":tileset.textures[ix]};
    }

	 /**
	  * Computes the x coordinate by considering all possible configuration options of tiled
	  * render order: right-down
	  * */
	 function computeXCoordinate(i, j, tilewidth, orientation, staggerindex)
	 {

	 		orientation = typeof orientation !== 'undefined' ? orientation : 'orthogonal';
	 		staggerindex = typeof staggerindex !== 'undefined' ? staggerindex : 'odd';
	 		var x;

			x = i * tilewidth;

			if ( 'staggered' === orientation ){

				if ( 'odd' === staggerindex ){

					x += (j % 2 != 0) ? tilewidth / 2 : 0;

				} else {

					x += (j % 2 == 0) ? tilewidth / 2 : 0;

				}
			}

			return x;
	 }

	 /**
	  * Computes the y coordinate by considering all possible configuration options of tiled
	  * render order: right-down
	  * */
	 function computeYCoordinate(j, tileheight_map, tileheight_tile, orientation)
	 {
	 		orientation = typeof orientation !== 'undefined' ? orientation : 'orthogonal';

			var y;

			if ( 'staggered' === orientation ){

				y = j * (tileheight_map / 2) - (tileheight_tile - tileheight_map);

			} else {

				y = j * tileheight_map;

			}

            // move each tile down to accomodate the bottom left tile anchor
            // this keeps the map itself top left anchored at 0,0
            y += tileheight_map;

			return y;
	 }

    return function (resource, next) {

        // early exit if it is not the right type
        if (!resource.data || !resource.isJson || !resource.data.layers || !resource.data.tilesets) {
            return next();
        }

        // tileset image paths are relative so we need the root path
        var root = path.dirname(resource.url);
        var data = resource.data;
        var map = new TiledMap(data);
        var toLoad = 0;
        var tilesetAndTexture;

        function addTilesetDataToMap(tilesetData, tile, tileid){
            var tileset;
            var src = "";
            var useCache = false;

            if ( tile && typeof tile.image !== "undefined") {
                src = path.join(root, tile.image);
            } else if ( typeof tilesetData.image !== "undefined") {
                src = path.join(root, tilesetData.image);
            } else {
                return;
            }

            var filename = src.split("/").pop();
            var baseTexture;
            var existingTexture;

            if ( PIXI && PIXI.utils.TextureCache && typeof PIXI.utils.TextureCache[filename] != "undefined") {
                existingTexture = PIXI.utils.TextureCache[filename];
                baseTexture = PIXI.BaseTexture.fromImage( existingTexture.baseTexture.imageUrl );
                useCache = true;
            } else {
                baseTexture = PIXI.BaseTexture.fromImage(src);
            }

            var tileset = new Tileset(tilesetData, baseTexture, existingTexture);

            // tiles with individual image files need to be treated as tilesets so that the assets are loaded. each tileset needs a unique firstgid
            if ( tile && tileid ) {
                tileset.firstGID = parseInt(tileset.firstGID) + parseInt(tileid);
            }

            if (useCache ) {
                tileset.updateTextures();
            }
            // update the textures once the base texture has loaded
            baseTexture.once('loaded', function () {
                toLoad--;
                tileset.updateTextures();

                if (toLoad <= 0) {
                    next();
                }
            });

            map.tilesets.push(tileset);

            return tileset;
         }

        data.tilesets.forEach(function (tilesetData) {
            var id, i, p, tile, shapeData, shapes, shape, points;
            toLoad++;

            var tileset = addTilesetDataToMap( tilesetData, false);

            for(id in tilesetData.tiles) {
                tile = tilesetData.tiles[id];
                tileset = addTilesetDataToMap( tilesetData, tile, id );

                if ( typeof tile.objectgroup !== "undefined") {
                    for(i = 0; i < tile.objectgroup.objects.length; i++) {
                        shapeData = tile.objectgroup.objects[0];
                        shapes = [];

                        if (shapeData.polygon) {
                            points = [];
                            for (p = 0; p < shapeData.polygon.length; p++) {
                                points.push(shapeData.polygon[p].x + shapeData.x);
                                points.push(shapeData.polygon[p].y + shapeData.y);
                            }
                            shape = new PIXI.Polygon(points);
                        } else if (shapeData.ellipse) {
                            shape = new PIXI.Circle(shapeData.x, shapeData.y, shapeData.height / 2);
                        } else {
                            shape = new PIXI.Rectangle(shapeData.x, shapeData.y, shapeData.width, shapeData.height);
                        }

                        shapes.push(shape);
                    }
                }

                // object data id is 1 lower than gid for some reason
                tileset.tiles[+id + 1] = {
                    collision: shapes
                };
            }
        });

        data.layers.forEach(function (layerData) {
            var layer = new Layer(layerData.name, layerData.opacity);

            switch(layerData.type) {
                case 'imagelayer':
                    var mapTexture = PIXI.Sprite.fromImage(layerData.image);
                    layer.addChild(mapTexture);
                    break;
                case 'objectlayer':
                    return util.warn('pixi-tiled: object layers currently unsupported');
                case 'objectgroup':
                    gids = [];
                    for (var ii = 0; ii < layerData.objects.length; ii++) {
                        var o = layerData.objects[ii];
                        tilesetAndTexture = findTilesetAndTexture(o.gid, map.tilesets);
                        texture = tilesetAndTexture.texture;

                        tile = new Tile(o.gid, texture);

                        tile.x = o.x; //computeXCoordinate(x, y, data.tilewidth, data.orientation, data.staggerindex);
                        tile.y = o.y;//computeYCoordinate(y, data.tileheight, tilesetAndTexture.tileset.imageHeight, data.orientation);

                        layer.addChild(tile);
                    }
                    break;

                case 'tilelayer':
                    if(layerData.compression) {
                        return util.warn('pixi-tiled: compressed layer data currently unsupported');
                    }

					// decode base64 if it is encoded
					if('base64' === layerData.encoding){
						var decodedCharBuffer = new Buffer(layerData.data, 'base64');
						var gids = [];
						for(var i = 0; i < decodedCharBuffer.length; i+=4){
							gids.push(decodedCharBuffer.readInt32LE(i));
						}

						layerData.data = gids;
					}

					// generate tiles for the layer
					var x, y, i, gid, texture, tile;

					for ( y = 0; y < layerData.height; y++ ) {

						 for ( x = 0; x < layerData.width; x++ ) {

							  i = x + (y * layerData.width);

							  gid = layerData.data[i];

							  // 0 is a gap
							  if ( gid !== 0 ) {

									tilesetAndTexture = findTilesetAndTexture(gid, map.tilesets);
									texture = tilesetAndTexture.texture;

									tile = new Tile(gid, texture);

									tile.x = computeXCoordinate(x, y, data.tilewidth, data.orientation, data.staggerindex);
									tile.y = computeYCoordinate(y, data.tileheight, tilesetAndTexture.tileset.imageHeight, data.orientation);

									layer.addChild(tile);
							  }
						 }
					}

                    break;
                default:
                    console.error("unhandled layer type",layerData.type);
				}

            // add to map
            map.layers[layer.name] = layer;
            map.addChild(layer);
        });

        resource.tiledMap = map;
    };
};

var util = require('./util');

/**
 * Tileset
 * @constructor
 */
var Tileset = function (data, texture, existingtexture) {

    this.baseTexture = texture;
    this.existingTexture = existingtexture;

    this.textures = [];

    this.name = data.name;
    this.firstGID = data.firstgid;
    this.imageHeight = data.imageheight ? data.imageheight : data.tileheight;
    this.imageWidth = data.imagewidth ? data.imagewidth : data.tilewidth;
    this.tileHeight = data.tileheight;
    this.tileWidth = data.tilewidth;
    this.margin = data.margin;
    this.spacing = data.spacing;

    if ( this.existingTexture) {
        this.imageHeight = this.baseTexture.height;
        this.imageWidth = this.baseTexture.width;
        this.tileHeight = this.existingTexture.trim.height;
        this.tileWidth = this.existingTexture.trim.width;
        this.margin = 0;
        this.spacing = 0;
        this.textures.push( new PIXI.Texture(this.baseTexture) );
        this.tiles = {};
        return;
    }
    // @todo data.properties?

    var x, y;

    // warn when sizing is mismatched
    if(
        (this.imageWidth - (2*this.margin)) % (this.tileWidth + this.spacing) !== this.spacing ||
        (this.imageHeight - (2*this.margin)) % (this.tileHeight + this.spacing) !== this.spacing
    ) {
        util.warn('pixi-tiled: tileset image dimensions do not match tileset data');
    }

    // create textures (invalid until baseTexture loaded)
    for (y = this.margin; y < this.imageHeight; y += this.tileHeight + this.spacing) {

        for (x = this.margin; x < this.imageWidth; x += this.tileWidth + this.spacing) {

            this.textures.push(
                new PIXI.Texture(this.baseTexture)
            );
        }
    }

    this.tiles = {};
};

/**
 * update the frames of the textures
 */
Tileset.prototype.updateTextures = function () {
    var texture, frame, x, y, i = 0;

    if ( this.existingTexture ) {
        this.textures[0].frame = this.existingTexture.frame;
        this.textures[0].trim = this.existingTexture.trim;
        // flip the y because the Tile.js anchors textures in bottom right???
        this.textures[0].trim.y = -this.textures[0].trim.y;
        return;
    }

    for (y = this.margin; y < this.imageHeight; y += this.tileHeight + this.spacing) {

        for (x = this.margin; x < this.imageWidth; x += this.tileWidth + this.spacing) {

            texture = this.textures[i];
            frame = texture.frame;

            frame.width = this.tileWidth;
            frame.height = this.tileHeight;
            frame.x = x;
            frame.y = y;

            // trim to fit to avoid errors
            // only caused by mismatched images/data
            if(frame.x + frame.width > this.baseTexture.width) {
                frame.width = (this.baseTexture.width - frame.x);
            }

            if(frame.y + frame.height > this.baseTexture.height) {
                frame.height = (this.baseTexture.height - frame.y);
            }

            // force UV update
            texture.frame = frame;

            i++;
        }
    }
};

module.exports = Tileset;

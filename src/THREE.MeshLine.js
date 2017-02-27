;(function() {

  "use strict";

  const { BufferGeometry, BufferAttribute, Material } = this;

  function LineGeometry ( numberOfVertices, widthCallback ) {

    BufferGeometry.call( this );

    this.widthCallback = widthCallback;

    var position = new Float32Array( numberOfVertices * 6 ),
        previous = new Float32Array( numberOfVertices * 6 ),
        next     = new Float32Array( numberOfVertices * 6 ),

        uv       = new Float32Array( numberOfVertices * 4 ),

        counters = new Float32Array( numberOfVertices * 2 ),
        width    = new Float32Array( numberOfVertices * 2 ),
        side     = new Float32Array( numberOfVertices * 2 ),

        indices  = new Uint16Array( ( numberOfVertices - 1 ) * 6 );

    for ( var i = 0; i < numberOfVertices; i++ )
    {
      var j = i * 2,
          k = i * 4,
          n = i * 6,
          l = i / numberOfVertices,
          m = i / ( numberOfVertices - 1 );

      uv[ k     ] = m;
      uv[ k + 1 ] = 0;
      uv[ k + 2 ] = m;
      uv[ k + 3 ] = 1;

      side[ j     ] =  1;
      side[ j + 1 ] = -1;

      counters[ j     ] = l
      counters[ j + 1 ] = l;

      if( widthCallback )
      {
        var w = widthCallback( m );

        width[ j     ] = w;
        width[ j + 1 ] = w;
      }
      else
      {
        width[ j     ] = 1
        width[ j + 1 ] = 1;
      }

      if ( i < numberOfVertices - 1 )
      {
        indices[ n     ] = j;
        indices[ n + 1 ] = j + 1;
        indices[ n + 2 ] = j + 2;
        indices[ n + 3 ] = j + 2;
        indices[ n + 4 ] = j + 1;
        indices[ n + 5 ] = j + 3;
      }
    }

    this.addAttribute( 'position', new BufferAttribute( position, 3 ) );
    this.addAttribute( 'previous', new BufferAttribute( previous, 3 ) );
    this.addAttribute( 'next',     new BufferAttribute( next,     3 ) );
    this.addAttribute( 'uv',       new BufferAttribute( uv,       2 ) );
    this.addAttribute( 'counters', new BufferAttribute( counters, 1 ) );
    this.addAttribute( 'width',    new BufferAttribute( width,    1 ) );
    this.addAttribute( 'side',     new BufferAttribute( side,     1 ) );

    this.setIndex( new BufferAttribute( indices, 1 ) );
  }

  LineGeometry.prototype = Object.create( BufferGeometry.prototype );
  LineGeometry.prototype.constructor = LineGeometry;

  Object.assign( LineGeometry.prototype, BufferGeometry.prototype,
  {
    lineTo : function ( index, x, y, z )
    {
      const { position, previous, next } = this.attributes;

      var length = position.count / 2,
          i = index * 6,
          p = i - 6,
          n = i + 6;

      if ( index == 0 )
      {
        previous.array[ i     ] = x;
        previous.array[ i + 1 ] = y;
        previous.array[ i + 2 ] = z;
        previous.array[ i + 3 ] = x;
        previous.array[ i + 4 ] = y;
        previous.array[ i + 5 ] = z;
      }
      else
      {
        next.array[ p     ] = x;
        next.array[ p + 1 ] = y;
        next.array[ p + 2 ] = z;
        next.array[ p + 3 ] = x;
        next.array[ p + 4 ] = y;
        next.array[ p + 5 ] = z;
      }

      position.array[ i     ] = x;
      position.array[ i + 1 ] = y;
      position.array[ i + 2 ] = z;
      position.array[ i + 3 ] = x;
      position.array[ i + 4 ] = y;
      position.array[ i + 5 ] = z;

      if ( index == length - 1 )
      {
        next.array[ i     ] = x;
        next.array[ i + 1 ] = y;
        next.array[ i + 2 ] = z;
        next.array[ i + 3 ] = x;
        next.array[ i + 4 ] = y;
        next.array[ i + 5 ] = z;
      }
      else
      {
        previous.array[ n     ] = x;
        previous.array[ n + 1 ] = y;
        previous.array[ n + 2 ] = z;
        previous.array[ n + 3 ] = x;
        previous.array[ n + 4 ] = y;
        previous.array[ n + 5 ] = z;
      }
    },

    valueAt : function ( index )
    {
      return this.attributes.position.array[ index * 6 + 1 ];
    },

    update : function()
    {
      const { position, previous, next } = this.attributes;

      position.needsUpdate = true;

      previous.needsUpdate = true;
      
      next.needsUpdate = true;
    },

    set : function ( array )
    {
      const { position, previous, next } = this.attributes;
      
      var length = position.count / 2;

      for( var index = 0, j = 0; index < length; index++, j = index * 3 )
      {
        this.lineTo( index, array[ j ], array[ j + 1 ], array[ j + 2 ] );
      }

      this.update();
    }

  });

  function MeshLineMaterial ( parameters ) {

    var vertexShaderSource = [
      'precision highp float;',
      '',
      'attribute vec3 position;',
      'attribute vec3 previous;',
      'attribute vec3 next;',
      'attribute float side;',
      'attribute float width;',
      'attribute vec2 uv;',
      'attribute float counters;',
      '',
      'uniform mat4 projectionMatrix;',
      'uniform mat4 modelViewMatrix;',
      'uniform vec2 resolution;',
      'uniform float lineWidth;',
      'uniform vec3 color;',
      'uniform float opacity;',
      'uniform float near;',
      'uniform float far;',
      'uniform float sizeAttenuation;',
      '',
      'varying vec2 vUV;',
      'varying vec4 vColor;',
      'varying float vCounters;',
      '',
      'vec2 fix( vec4 i, float aspect ) {',
      '',
      '    vec2 res = i.xy / i.w;',
      '    res.x *= aspect;',
      '    vCounters = counters;',
      '    return res;',
      '',
      '}',
      '',
      'void main() {',
      '',
      '    float aspect = resolution.x / resolution.y;',
      '    float pixelWidthRatio = 1. / (resolution.x * projectionMatrix[0][0]);',
      '',
      '    vColor = vec4( color, opacity );',
      '    vUV = uv;',
      '',
      '    mat4 m = projectionMatrix * modelViewMatrix;',
      '    vec4 finalPosition = m * vec4( position, 1.0 );',
      '    vec4 prevPos = m * vec4( previous, 1.0 );',
      '    vec4 nextPos = m * vec4( next, 1.0 );',
      '',
      '    vec2 currentP = fix( finalPosition, aspect );',
      '    vec2 prevP = fix( prevPos, aspect );',
      '    vec2 nextP = fix( nextPos, aspect );',
      '',
      '    float pixelWidth = finalPosition.w * pixelWidthRatio;',
      '    float w = 1.8 * pixelWidth * lineWidth * width;',
      '',
      '    if( sizeAttenuation == 1. ) {',
      '        w = 1.8 * lineWidth * width;',
      '    }',
      '',
      '    vec2 dir;',
      '    if( nextP == currentP ) dir = normalize( currentP - prevP );',
      '    else if( prevP == currentP ) dir = normalize( nextP - currentP );',
      '    else {',
      '        vec2 dir1 = normalize( currentP - prevP );',
      '        vec2 dir2 = normalize( nextP - currentP );',
      '        dir = normalize( dir1 + dir2 );',
      '',
      '        vec2 perp = vec2( -dir1.y, dir1.x );',
      '        vec2 miter = vec2( -dir.y, dir.x );',
      '        //w = clamp( w / dot( miter, perp ), 0., 4. * lineWidth * width );',
      '',
      '    }',
      '',
      '    //vec2 normal = ( cross( vec3( dir, 0. ), vec3( 0., 0., 1. ) ) ).xy;',
      '    vec2 normal = vec2( -dir.y, dir.x );',
      '    normal.x /= aspect;',
      '    normal *= .5 * w;',
      '',
      '    vec4 offset = vec4( normal * side, 0.0, 1.0 );',
      '    finalPosition.xy += offset.xy;',
      '',
      '    gl_Position = finalPosition;',
      '',
      '}' ];

    var fragmentShaderSource = [
      '#extension GL_OES_standard_derivatives : enable',
      'precision mediump float;',
      '',
      'uniform sampler2D map;',
      'uniform sampler2D alphaMap;',
      'uniform float useMap;',
      'uniform float useAlphaMap;',
      'uniform float useDash;',
      'uniform vec2 dashArray;',
      'uniform float visibility;',
      'uniform float alphaTest;',
      'uniform vec2 repeat;',
      '',
      'varying vec2 vUV;',
      'varying vec4 vColor;',
      'varying float vCounters;',
      '',
      'void main() {',
      '',
      '    vec4 c = vColor;',
      '    if( useMap == 1. ) c *= texture2D( map, vUV * repeat );',
      '    if( useAlphaMap == 1. ) c.a *= texture2D( alphaMap, vUV * repeat ).a;',
      '    if( c.a < alphaTest ) discard;',
      '    if( useDash == 1. ){',
      '      ',
      '    }',
      '    gl_FragColor = c;',
      '    gl_FragColor.a *= step(vCounters,visibility);',
      '}' ];

    function check( v, d ) {
      if( v === undefined ) return d;
      return v;
    }

    Material.call( this );

    parameters = parameters || {};

    this.lineWidth = check( parameters.lineWidth, 1 );
    this.map = check( parameters.map, null );
    this.useMap = check( parameters.useMap, 0 );
    this.alphaMap = check( parameters.alphaMap, null );
    this.useAlphaMap = check( parameters.useAlphaMap, 0 );
    this.color = check( parameters.color, new THREE.Color( 0x000000 ) );
    this.opacity = check( parameters.opacity, 1 );
    this.resolution = check( parameters.resolution, new THREE.Vector2( 1, 1 ) );
    this.sizeAttenuation = check( parameters.sizeAttenuation, false );
    this.near = check( parameters.near, 0 );
    this.far = check( parameters.far, 1000 );
    this.dashArray = check( parameters.dashArray, [] );
    this.useDash = ( this.dashArray !== [] ) ? 1 : 0;
    this.visibility = check( parameters.visibility, 1 );
    this.alphaTest = check( parameters.alphaTest, 0 );
    this.repeat = check( parameters.repeat, new THREE.Vector2( 1, 1 ) );

    var material = new THREE.RawShaderMaterial( {
      uniforms: {
        lineWidth: { type: 'f', value: this.lineWidth },
        map: { type: 't', value: this.map },
        useMap: { type: 'f', value: this.useMap },
        alphaMap: { type: 't', value: this.alphaMap },
        useAlphaMap: { type: 'f', value: this.useAlphaMap },
        color: { type: 'c', value: this.color },
        opacity: { type: 'f', value: this.opacity },
        resolution: { type: 'v2', value: this.resolution },
        sizeAttenuation: { type: 'f', value: this.sizeAttenuation },
        near: { type: 'f', value: this.near },
        far: { type: 'f', value: this.far },
        dashArray: { type: 'v2', value: new THREE.Vector2( this.dashArray[ 0 ], this.dashArray[ 1 ] ) },
        useDash: { type: 'f', value: this.useDash },
        visibility: {type: 'f', value: this.visibility},
        alphaTest: {type: 'f', value: this.alphaTest},
        repeat: { type: 'v2', value: this.repeat }
      },
      vertexShader: vertexShaderSource.join( '\r\n' ),
      fragmentShader: fragmentShaderSource.join( '\r\n' )
    });

    delete parameters.lineWidth;
    delete parameters.map;
    delete parameters.useMap;
    delete parameters.alphaMap;
    delete parameters.useAlphaMap;
    delete parameters.color;
    delete parameters.opacity;
    delete parameters.resolution;
    delete parameters.sizeAttenuation;
    delete parameters.near;
    delete parameters.far;
    delete parameters.dashArray;
    delete parameters.visibility;
    delete parameters.alphaTest;
    delete parameters.repeat;

    material.type = 'MeshLineMaterial';

    material.setValues( parameters );

    return material;

  };

  MeshLineMaterial.prototype = Object.create( Material.prototype );
  MeshLineMaterial.prototype.constructor = MeshLineMaterial;

  MeshLineMaterial.prototype.copy = function ( source ) {

    Material.prototype.copy.call( this, source );

    this.lineWidth = source.lineWidth;
    this.map = source.map;
    this.useMap = source.useMap;
    this.alphaMap = source.alphaMap;
    this.useAlphaMap = source.useAlphaMap;
    this.color.copy( source.color );
    this.opacity = source.opacity;
    this.resolution.copy( source.resolution );
    this.sizeAttenuation = source.sizeAttenuation;
    this.near = source.near;
    this.far = source.far;
    this.dashArray.copy( source.dashArray );
    this.useDash = source.useDash;
    this.visibility = source.visibility;
    this.alphaTest = source.alphaTest;
    this.repeat.copy( source.repeat );

    return this;
  };

  this.LineGeometry = LineGeometry;
  this.MeshLineMaterial = MeshLineMaterial;

}).call( THREE );

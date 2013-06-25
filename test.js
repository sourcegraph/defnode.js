var acorn = require('acorn'),
    astannotate = require('astannotate'),
    defnode = require('./defnode'),
    fs = require('fs'),
    path = require('path'),
    should = require('should');

describe('findDefinitionNode', function() {
  ['assign.js', 'func.js', 'globals.js', 'object.js'].forEach(function(filename) {
    it(filename, function(done) {
      var file = fs.readFile(path.join('testdata/findDefinitionNode', filename), 'utf8', function(err, text) {
        should.ifError(err);
        var visitor = astannotate.nodeVisitor('DEF', 'Identifier', function(ident, defInfo) {
          var def = defnode.findDefinitionNode(acorn.parse(text), ident.start, ident.end);
          if (defInfo == 'null') {
            should.not.exist(def);
          } else {
            defInfo = defInfo.split(',')
            var defNodeType = defInfo[0], defOffsets = defInfo.slice(1).map(parseFloat);
            should.exist(def);
            def.type.should.eql(defNodeType);
            if (defOffsets[0]) {
              ({type: def.type, start: def.start, end: def.end}).should.eql({type: defNodeType, start: ident.start + defOffsets[0], end: ident.end + defOffsets[1]});
            }
          }
        });
        var ast = acorn.parse(text)
        visitor(text, ast);
        done();
      });
    });
  });
});

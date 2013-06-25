var walk = require('acorn/util/walk'),
    walkall = require('walkall');

// findDefinitionNode takes the start/end position of an Identifier node and
// returns the definition node (in ast) corresponding to the definition that
// the Identifier identifies. For a FunctionDeclaration name, this is the
// FunctionDeclaration; for a VariableDeclaration variable name, this is the
// VariableDeclarator init; for ObjectExpression keys, this is the
// corresponding value; for function parameters, this is itself; and for all
// other inputs, this is undefined.
//
// This mapping is intended to correspond to what tern considers the identifier
// of a given definition. I.e., if you use tern to ask for the definition of
// some symbol, and it gives you an Identifier, you can use findDefinitionNode
// to find the definition value of the Identifier.
exports.findDefinitionNode = function(ast, start, end) {
  var origin = exports.findOriginPseudonode(ast, start, end);
  if (!origin) return;
  if (!origin.type && origin.key && origin.value && origin.kind) {
    // ObjectExpression property
    return origin.value;
  }
  switch (origin.type) {
  case 'AssignmentExpression':
    return rightmostExprOfAssignment(origin);
  case 'Identifier':
    return origin;
  case 'VariableDeclarator':
    return origin.init && rightmostExprOfAssignment(origin.init);
  default:
    return origin;
  }
};

// findOriginPseudonode finds the AST node or node-like object of the
// declaration/definition that encloses the Identifier AST node with the
// specified start/end.
//
// This function returns ObjectExpression property objects if the Identifier is
// an ObjectExpression property key. These objects are not true AST nodes (thus
// the "pseudonode" description).
exports.findOriginPseudonode = function(ast, start, end) {
  var ident = walk.findNodeAt(ast, start, end, 'Identifier', walkall.traversers);
  if (!ident) throw new Error('No Identifier node found at position ' + start + '-' + end);
  ident = ident.node;
  if (ident.type != 'Identifier') throw new Error('Node at position ' + start + '-' + end + ' has type ' + ident.type + ', not Identifier');

  // find enclosing decl-like node
  var enc = walk.findNodeAround(ast, end, okNodeTypes(['AssignmentExpression', 'FunctionDeclaration', 'FunctionExpression', 'ObjectExpression', 'VariableDeclarator']), walkall.traversers);
  if (!enc) throw new Error('No enclosing declaration node found for Identifier at position ' + start + '-' + enc);
  enc = enc.node;
  switch (enc.type) {
  case 'AssignmentExpression':
    // We only want to consider this assignment a definition if our ident node
    // is the LHS of the AssignmentExpression, or the property of the
    // AssignmentExpression's LHS MemberExpression. Otherwise, we're not really
    // defining something with this ident.
    if (enc.left == ident || (enc.left.type == 'MemberExpression' && enc.left.property == ident)) {
      return enc;
    }
    break;
  case 'FunctionDeclaration':
  case 'FunctionExpression':
    if (enc.id == ident) {
      // the ident is the function name
      return enc;
    } else if (enc.params.indexOf(ident) != -1) {
      // the ident is a function param
      return ident;
    }
    break;
  case 'ObjectExpression':
    return findPropInObjectExpressionByKeyPos(enc, start, end);
  case 'VariableDeclarator':
    return enc;
  }
};

function okNodeTypes(types) {
  return function(_t) {
    return types.indexOf(_t) != -1;
  }
}

function findPropInObjectExpressionByKeyPos(objectExpr, start, end) {
  for (var i = 0; i < objectExpr.properties.length; ++i) {
    var prop = objectExpr.properties[i];
    if (prop.key.start == start && prop.key.end == end) {
      return prop;
    }
  }
}

// rightmostExprOfAssignment follows chained AssignmentExpressions to the rightmost
// expression. E.g., given the AssignmentExpression AST node of `a = b = c =
// 7`, it returns the Literal value 7 on the far right.
function rightmostExprOfAssignment(assignmentExpr) {
  while (assignmentExpr.type == 'AssignmentExpression') {
    assignmentExpr = assignmentExpr.right;
  }
  return assignmentExpr;
}

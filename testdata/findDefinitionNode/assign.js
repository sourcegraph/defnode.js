var a = {};
a/*DEF:null*/.b/*DEF:Literal*/ = 2;

// chained
a/*DEF:null*/.c/*DEF:Literal*/ = a.d/*DEF:Literal*/ = 2;

var e, f;
e/*DEF:Literal*/ = f/*DEF:Literal*/ = 3;

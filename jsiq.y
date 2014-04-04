
/* description: Parses end executes mathematical expressions. */

/* lexical grammar */
%lex
%options case-insensitive

digit [0-9]
esc   "\\"
card  (?:[0-9]|[1-9][0-9]+)
exp   (?:[eE][-+]?[0-9]+)
frac  (?:\.[0-9]+)
ws    [\s]

%%

{card}{frac}?{exp}?\b return 'NUMBER';

'"'("\\x"[a-fA-F0-9]{2}|"\\u"[a-fA-F0-9]{4}|"\\"[^xu]|[^"{esc}\n])*'"' {
  yytext = yytext.substr(1,yyleng-2); return 'STRING';
}
"'"("\\"['bfvnrt/{esc}]|"\\u"[a-fA-F0-9]{4}|[^'{esc}])*"'" {
  yytext = yytext.substr(1,yyleng-2); return 'STRING';
}

{ws}+                     /* skip whitespace */
"undefined"               return 'UNDEFINED';
"null"                    return 'NULL';
"true"                    return 'TRUE';
"false"                   return 'FALSE';
"eq"                      return 'EQ';
"ne"                      return 'NE';
"lt"                      return 'LT';
"le"                      return 'LE';
"gt"                      return 'GT';
"ge"                      return 'GE';
"and"                     return 'AND';
"or"                      return 'OR';
"not"					  return 'NOT';
"||"                      return 'STR_CAT';
"boolean"				  return 'BOOL_OP';
"("                       return '(';
")"                       return ')';
"["                       return '[';
"]"                       return ']';
"{"                       return '{';
"}"                       return '}';
"?"                       return '?';
":"                       return ':';
"."                       return '.';
","                       return ',';
"+"                       return '+';
"-"                       return '-';
"*"                       return '*';
"/"                       return '/';
"mod"                     return 'MOD';
"to"                      return 'RANGE_OP';
$[A-Za-z_$][A-Za-z_$0-9]+ return 'VAR_REF';
[A-Za-z_$][A-Za-z_$0-9]+  return 'IDENT';
<<EOF>>                   return 'EOF';

/lex

/* Operator Associativity and Precedence */

%left '?'
%left RANGE_OP
%left STR_CAT
%left AND OR NOT
%left EQ NE
%left GT GE LT LE
%left '+' '-'
%left '*' '/' MOD
%left '.'
%left UNARY

%nonassoc '['
%nonassoc EXPR_WITHOUT_POST

%start jsoniq

%% /* Parser Grammar */

jsoniq
	: Expression EOF { $$ = yy.expr.multi($1); return $$; }
	;

Expression
	: Expression ',' ExprSingle { $1.push($3); $$ = $1; }
	| ExprSingle { $$ = [ $1 ]; }
	;

ExprSingle
	: Item
	| RangeExpression
	| AdditiveExpression
	| MultiplicativeExpression
	| StringConcatExpression
	| ComparisonExpression
	| LogicExpression
	| ConversionExpression
	| UnaryExpression
	| ObjectLookup
	| ArrayLookup
	| ArrayUnbox
	| '(' Expression ')' { $$ = yy.expr.multi($2); }
	| '(' ')' { $$ = yy.expr.empty(); }
	;
	
Item
	: Atomic { $$ = yy.expr.atomic($1); }
	| Object { $$ = $1; }
	| Array { $$ = $1; }
	;

Atomic
	: NUMBER { $$ = +$1; }
	| STRING { $$ = $1; }
	| TRUE { $$ = true; }
	| FALSE { $$ = false; }
	| NULL { $$ = null; }
	| UNDEFINED { $$ = undefined; }
	;

Array
	: '[' ']' { $$ = yy.expr.array([]); }
	| '[' ArrayItems ']' { $$ = yy.expr.array($2); }
	;

ArrayItems
	: ArrayItems ',' ExprSingle { $1.push($3); $$ = $1; }
	| ExprSingle { $$ = [ $1 ]; }
	;

Object
	: '{' '}' { $$ = yy.expr.object({}); }
	| '{' ObjectProperties '}'  { $$ = yy.expr.object($2); }
	;

ObjectProperties
	: ObjectProperties ',' PropertyPair { $1.push($3); $$ = $1; }
	| PropertyPair { $$ = [ $1 ]; }
	;

PropertyPair
	: ExprSingle ':' ExprSingle { $$ = [$1, $3]; }
	| IDENT ':' ExprSingle { $$ = [yy.expr.atomic($1), $3]; }
	;

ObjectLookup
	: ExprSingle '.' IDENT { $$ = yy.expr.lookup($1, yy.expr.atomic($3)); }
	| ExprSingle '.' ExprSingle { $$ = yy.expr.lookup($1, $3); }
	;

ArrayLookup
	: ExprSingle '[' '[' ExprSingle ']' ']' { $$ = yy.expr.index($1, $4); }
	;
	
ArrayUnbox
	: ExprSingle '[' ']' { $$ = yy.expr.unbox($1); }
	;

UnaryExpression
	: '+' ExprSingle %prec UNARY { $$ = yy.expr.unary_plus($2); }
	| '-' ExprSingle %prec UNARY { $$ = yy.expr.unary_minus($2); }
	;

RangeExpression
	: ExprSingle RANGE_OP ExprSingle { $$ = yy.expr.range($1, $3); }
	;

AdditiveExpression
	: ExprSingle '+' ExprSingle { $$ = yy.expr.plus($1, $3); }
	| ExprSingle '-' ExprSingle { $$ = yy.expr.minus($1, $3); }
	; 

MultiplicativeExpression
	: ExprSingle MOD ExprSingle { $$ = yy.expr.mod($1, $3); }
	| ExprSingle '/' ExprSingle { $$ = yy.expr.div($1, $3); }
	| ExprSingle '*' ExprSingle { $$ = yy.expr.mul($1, $3); }
	;

StringConcatExpression
	: ExprSingle STR_CAT ExprSingle { $$ = yy.expr.concat($1, $3); }
	;

ComparisonExpression
	: ExprSingle EQ ExprSingle { $$ = yy.expr.eq($1, $3); }
	| ExprSingle NE ExprSingle { $$ = yy.expr.ne($1, $3); }
	| ExprSingle LT ExprSingle { $$ = yy.expr.lt($1, $3); }
	| ExprSingle LE ExprSingle { $$ = yy.expr.le($1, $3); }
	| ExprSingle GT ExprSingle { $$ = yy.expr.gt($1, $3); }
	| ExprSingle GE ExprSingle { $$ = yy.expr.ge($1, $3); }
	;

LogicExpression
	: ExprSingle OR ExprSingle { $$ = yy.expr.or($1, $3); }
	| ExprSingle AND ExprSingle { $$ = yy.expr.and($1, $3); }
	| NOT ExprSingle { $$ = yy.expr.not($2); }
	;

ConversionExpression
	: BOOL_OP '(' ExprSingle ')' { $$ = yy.expr.boolean($3); }
	;

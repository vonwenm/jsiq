
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
    : Expression EOF { $$ = $1; return $$; }
    ;

Expression
    : Expression ',' ExprSingle { $$ = yy.seq($1, $3); }
    | ExprSingle { $$ = yy.seq($1); }
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
    | '(' Expression ')' { $$ = $2; }
    | '(' ')' { $$ = yy.seq(); }
    ;
    
Item
    : Atomic { $$ = yy.seq($1); }
    | Object { $$ = yy.seq($1); }
    | Array { $$ = yy.seq($1); }
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
    : '[' ']' { $$ = []; }
    | '[' ArrayItems ']' { $$ = $2; }
    ;

ArrayItems
    : ArrayItems ',' ExprSingle { $1.push($3.value()); $$ = $1; }
    | ExprSingle { $$ = [ $1.value() ]; }
    ;

Object
    : '{' '}' { $$ = {}; }
    | '{' ObjectProperties '}'  { $$ = $2; }
    ;

ObjectProperties
    : ObjectProperties ',' PropertyPair { $$ = $1; $$[$3[0]] = $3[1]; }
    | PropertyPair { $$ = {}; $$[$1[0]] = $1[1]; }
    ;

PropertyPair
	: ExprSingle ':' ExprSingle { $$ = [$1.value(), $3.value()]; }
	| IDENT ':' ExprSingle { $$ = [$1, $3]; }
	;

ObjectLookup
	: ExprSingle '.' IDENT { $$ = $1.lookup($3); }
	| ExprSingle '.' ExprSingle { $$ = $1.lookup($3.string()); }
	;

ArrayLookup
	: ExprSingle '[' '[' ExprSingle ']' ']' { $$ = $1.index( $4.number() ); }
	;
	
ArrayUnbox
	: ExprSingle '[' ']' { $$ = $1.unbox(); }
	;

UnaryExpression
	: '+' ExprSingle %prec UNARY { $$ = +$2.number(); }
	| '-' ExprSingle %prec UNARY { $$ = -$2.number(); }
	;

RangeExpression
	: ExprSingle RANGE_OP ExprSingle { $$ = yy.range($1, $3); }
	; 

AdditiveExpression
	: ExprSingle '+' ExprSingle { $$ = yy.seq($1.value() + $3.value()); }
	| ExprSingle '-' ExprSingle { $$ = yy.seq($1.value() - $3.value()); }
	; 

MultiplicativeExpression
	: ExprSingle MOD ExprSingle { $$ = yy.seq($1.value() % $3.value()); }
	| ExprSingle '/' ExprSingle { $$ = yy.seq($1.value() / $3.value()); }
	| ExprSingle '*' ExprSingle { $$ = yy.seq($1.value() * $3.value()); }
	;

StringConcatExpression
	: ExprSingle STR_CAT ExprSingle { $$ = yy.seq($1.string() + $3.string()); }
	;

ComparisonExpression
	: ExprSingle EQ ExprSingle { $$ = yy.seq($1.value() == $3.value()); }
	| ExprSingle NE ExprSingle { $$ = yy.seq($1.value() != $3.value()); }
	| ExprSingle LT ExprSingle { $$ = yy.seq($1.value() < $3.value()); }
	| ExprSingle LE ExprSingle { $$ = yy.seq($1.value() <= $3.value()); }
	| ExprSingle GT ExprSingle { $$ = yy.seq($1.value() > $3.value()); }
	| ExprSingle GE ExprSingle { $$ = yy.seq($1.value() >= $3.value()); }
	;

LogicExpression
	: ExprSingle OR ExprSingle { $$ = yy.seq(!!$1.value() || !!$3.value()); }
	| ExprSingle AND ExprSingle { $$ = yy.seq(!!$1.value() && !!$3.value()); }
	| NOT ExprSingle { $$ = yy.seq(!$2.value()); }
	;

ConversionExpression
	: BOOL_OP '(' ExprSingle ')' { $$ = yy.seq($3.boolean()); }
	;


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
"lt"                       return 'LT';
"le"                      return 'LE';
"gt"                      return 'GT';
"ge"                       return 'GE';
"&&"                      return 'AND';
"||"                      return 'STR_CAT';
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
"%"                       return '%';
"to"                      return 'RANGE_OP';
[A-Za-z_$][A-Za-z_$0-9]+  return 'IDENT';
<<EOF>>                   return 'EOF';

/lex

/* Operator Associativity and Precedence */

%left '?'
%left RANGE_OP
%left STR_CAT
%left AND
%left EQ NE
%left GT GE LT LE
%left '+' '-'
%left '*' '/' '%'
%left NOT
%left '.'

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
    : Item { $$ = yy.seq($1); }
    | RangeExpression
    | AdditiveExpression
    | MultiplicativeExpression
    | StringConcat
    ;

Item
    : Atomic { $$ = $1; }
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
    : '[' ']' { $$ = []; }
    | '[' ArrayItems ']' { $$ = $2; }
    ;

ArrayItems
    : ArrayItems ',' ExprSingle { $$ = $1.concat($3); }
    | ExprSingle { $$ = [ $1 ]; }
    ;

Object
    : '{' '}' { $$ = {}; }
    | '{' ObjectProperties '}'  { $$ = $1; }
    ;

ObjectProperties
    : ObjectProperties ',' PropertyPair { $$ = $1; $$[$3[0]] = $3[1]; }
    | PropertyPair { $$ = {}; $$[$1[0]] = $1[1]; }
    ;

PropertyPair
	: STRING ':' ExprSingle { $$ = [$1, $3]; }
	| IDENT ':' ExprSingle { $$ = [$1, $3]; }
	;

RangeExpression
	: ExprSingle RANGE_OP ExprSingle { $$ = yy.range($1, $3); }
	; 

AdditiveExpression
	: ExprSingle '+' ExprSingle { $$ = yy.seq($1.value() + $3.value()); }
	| ExprSingle '-' ExprSingle { $$ = yy.seq($1.value() - $3.value()); }
	; 

MultiplicativeExpression
	: ExprSingle '%' ExprSingle { $$ = yy.seq($1.value() % $3.value()); }
	| ExprSingle '/' ExprSingle { $$ = yy.seq($1.value() / $3.value()); }
	| ExprSingle '*' ExprSingle { $$ = yy.seq($1.value() * $3.value()); }
	;

StringConcat
	: ExprSingle STR_CAT ExprSingle { $$ = yy.seq($1.string() + $3.string()); }
	;

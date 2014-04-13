
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
"if"                      return 'IF';
"then"                    return 'THEN';
"else"                    return 'ELSE';
"switch"                  return 'SWITCH';
"case"                    return 'CASE';
"default"                 return 'DEFAULT';
"return"                  return 'RETURN';
"for"                     return 'FOR';
"as"                      return 'AS';
"allowing"                return 'ALLOWING';
"empty"                   return 'EMPTY';
"at"                      return 'AT';
"in"                      return 'IN';
"where"                   return 'WHERE';
"let"                     return 'LET';
"order by"                return 'ORDER_BY';
"ascending"               return 'ASCENDING';
"descending"              return 'DESCENDING';
"greatest"                return 'GREATEST';
"least"                   return 'LEAST';
"group by"                return 'GROUP_BY';
"("                       return '(';
")"                       return ')';
"["                       return '[';
"]"                       return ']';
"{"                       return '{';
"}"                       return '}';
"?"                       return '?';
":="                      return ':=';
":"                       return ':';
"."                       return '.';
","                       return ',';
"+"                       return '+';
"-"                       return '-';
"*"                       return '*';
"/"                       return '/';
"!"                       return '!';
"#"                       return '#';
"mod"                     return 'MOD';
"to"                      return 'RANGE_OP';
"$$"                      return 'VAR_CONTEXT';
\$[A-Za-z_][A-Za-z_0-9]*   return 'VAR_REF';
[A-Za-z_][A-Za-z_0-9]*    return 'IDENT';
<<EOF>>                   return 'EOF';

/lex

/* Operator Associativity and Precedence */

%nonassoc IF
%nonassoc RETURN
%nonassoc '['

%left '!'
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
	| SequencePredicate
	| ContextItem
	| VarRef
	| IfExpression
	| SwitchExpression
	| FunctionExpression
	| FLOWRExpression
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
	: ExprSingle '[' '#' ExprSingle '#' ']' { $$ = yy.expr.index($1, $4); }
	;
	
ArrayUnbox
	: ExprSingle '[' ']' { $$ = yy.expr.unbox($1); }
	;

SequencePredicate
	: ExprSingle '[' ExprSingle ']' { $$ = yy.expr.predicate($1, $3); }
	;

ContextItem
	: VAR_CONTEXT { $$ = yy.expr.context(); }
	;

VarRef
	: VAR_REF { $$ = yy.expr.varref(yytext); }
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

IfExpression
	: IF '(' ExprSingle ')' THEN ExprSingle ELSE ExprSingle { $$ = yy.expr.ifclause($3, $6, $8); }
	;

SwitchExpression
	: SWITCH '(' ExprSingle ')' SwitchCaseClauses DEFAULT RETURN ExprSingle { $$ = yy.expr.switchclause($3, $5, $8); }
	;

SwitchCaseClauses
	: SwitchCaseClauses SwitchCaseClause { $1.push($2); $$ = $1; }
	| SwitchCaseClause { $$ = [ $1 ]; }
	;

SwitchCaseClause
	: CASE ExprSingle RETURN ExprSingle { $$ = [ $2, $4 ]; }
	;

FunctionExpression
	: IDENT '(' FunctionParameters ')' { $$ = yy.expr.invoke($1, $3); }
	| IDENT '(' ')' { $$ = yy.expr.invoke($1, []); }
	;

FunctionParameters
	: FunctionParameters ',' ExprSingle { $1.push($3); $$ = $1; }
	| ExprSingle { $$ = [ $1 ]; }
	;

FLOWRExpression
	: ForClause FLOWRClauses ReturnClause { $$ = yy.expr.flowr($1, $2, $3); }
	| LetClause FLOWRClauses ReturnClause { $$ = yy.expr.flowr($1, $2, $3); }
	| ForClause ReturnClause { $$ = yy.expr.flowr($1, $2); }
	| LetClause ReturnClause { $$ = yy.expr.flowr($1, $2); }
	| MapClause
	;

MapClause
	: ExprSingle '!' ExprSingle
		{
			var forclause = yy.flowr.forclause("$$", false, null, $1);
			var retclause = yy.flowr.returnclause($3);
			$$ = yy.expr.flowr(yy.flowr.applyfors([forclause]), retclause);
		}
	;

FLOWRClauses
	: FLOWRClauses FLOWRClause { $1.push($2); $$ = $1; }
	| FLOWRClause { $$ = [ $1 ]; }
	;

FLOWRClause
	: ForClause
	| LetClause
	| WhereClause
	| OrderByClause
	| GroupByClause
	;

ForClause
	: FOR ForClauseVars { $$ = yy.flowr.applyfors($2); }
	;

ForClauseVars
	: ForClauseVars ',' ForClauseVar { $1.push($3); $$ = $1; }
	| ForClauseVar { $$ = [ $1 ]; }
	;

ForClauseVar
	: VAR_REF ALLOWING EMPTY AT VAR_REF IN ExprSingle { $$ = yy.flowr.forclause($1, true, $5, $7); }
	| VAR_REF ALLOWING EMPTY IN ExprSingle { $$ = yy.flowr.forclause($1, true, null, $5); }
	| VAR_REF AT VAR_REF IN ExprSingle { $$ = yy.flowr.forclause($1, false, $3, $5); }
	| VAR_REF IN ExprSingle { $$ = yy.flowr.forclause($1, false, null, $3); }
	;

LetClause
	: LET LetVars { $$ = $2; }
	;

LetVars
	: LetVars, LetVar { $1.push($2); $$ = $1; }
	| LetVar { $$ = [ $1 ]; }
	;

LetVar
	: VAR_REF ':=' ExprSingle { $$ = yy.flowr.letclause($1, $3); }
	;

WhereClause
	: WHERE ExprSingle { $$ = yy.flowr.whereclause($2); }
	;

OrderByClause
	: ORDER_BY OrderByClauses { $$ = yy.flowr.orderbyclause($2); }
	;

OrderByClauses
	: OrderByClauses ',' OrderByExpression { $1.push($3); $$ = $1; }
	| OrderByExpression { $$ = [ $1 ]; }
	;
	
OrderByExpression
	: ExprSingle { $$ = yy.flowr.orderbycomparison($1, true, true); }
	| ExprSingle ASCENDING { $$ = yy.flowr.orderbycomparison($1, true, true); }
	| ExprSingle EMPTY LEAST { $$ = yy.flowr.orderbycomparison($1, true, true); }
	| ExprSingle ASCENDING EMPTY LEAST { $$ = yy.flowr.orderbycomparison($1, true, true); }
	| ExprSingle ASCENDING EMPTY GREATEST { $$ = yy.flowr.orderbycomparison($1, true, false); }
	| ExprSingle DESCENDING { $$ = yy.flowr.orderbycomparison($1, false, true); }
	| ExprSingle EMPTY GREATEST { $$ = yy.flowr.orderbycomparison($1, true, false); }
	| ExprSingle DESCENDING EMPTY LEAST { $$ = yy.flowr.orderbycomparison($1, false, true); }
	| ExprSingle DESCENDING EMPTY GREATEST { $$ = yy.flowr.orderbycomparison($1, false, false); }
	;

GroupByClause
	: GROUP_BY GroupByClauses { $$ = yy.flowr.groupbyclause($2); }
	;

GroupByClauses
	: GroupByClauses ',' GroupByExpression { $1.push($3); $$ = $1; }
	| GroupByExpression { $$ = [ $1 ]; }
	;
	
GroupByExpression
	: VAR_REF { $$ = [$1, yy.expr.varref(yytext)]; }
	| VAR_REF ':=' ExprSingle { $$ = [$1, $3]; }
	;

ReturnClause
	: RETURN ExprSingle { $$ = yy.flowr.returnclause($2); }
	;




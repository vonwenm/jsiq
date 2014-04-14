# jsiq

### A Javascript implementation of the [JSONiq](http://www.jsoniq.org/) query language

Implemented using the [jison parser generator](https://www.google.com)

jsiq's main goal is to facilitate querying json data in a web client. It does not currently implement the full JSONiq standard, but rather a large enough subset to create complexe sql-like queries.

### JSONiq Implementation Status
-------------------

&#x2714; Implemented (but not very well tested)
&#x2718; Not Implemented
&#x2705; Functional with quirks

-------------------
| **Feature** | **State** | **Quirks** |
|:--- |:---:| --- |:---:|
| Prolog | &#x2718; | And everything it contains |
| Objects | &#x2714; | |
| Arrays | &#x2714; | |
| Atomics | &#x2714; | |
| String | &#x2714; | |
| Integer | &#x2705; | Javascript Number |
| Decimal | &#x2705; | Javascript Number |
| Double | &#x2705; | Javascript Number |
| Boolean | &#x2714; | |
| null | &#x2714; | |
| Dates | &#x2718; | |
| Collections | &#x2714; | |
| Object Constructor | &#x2714; | |
| Object Merge Constructor | &#x2718; | |
| Array Constructor | &#x2714; | |
| Range Operator | &#x2714; | |
| Parenthesized Expression | &#x2714; | |
| Arithmetics | &#x2705; | with the exception of idiv |
| String Concatenation | &#x2714; | |
| Comparison | &#x2714; | |
| Logics | &#x2714; | |
| Quantified Expressions | &#x2718; | |
| Function Calls | &#x2705; | basic built in support, none defined (except count), no namespaces |
| Object Field Selector | &#x2714; | |
| Array Lookup | &#x2705; | implemented with different syntax: [# Expr #] instead of [[ Expr ]] |
| Array Unboxing | &#x2714; | |
| Sequence Predicates | &#x2714; | |
| Context Item Expression | &#x2714; | |
| Control Flow Expressions | &#x2714; | |
| Switch Expressions | &#x2714; | |
| Try Catch Expressions | &#x2718; | |
| Map Operator | &#x2714; | |
| InstanceOf Expression | &#x2718; | |
| TreatAs Expression | &#x2718; | |
| Cast Expression | &#x2718; | |
| Typeswitch Expression | &#x2718; | |
| Sequence Types | &#x2718; | |
| **FLOWR Expressions** |||
| For Clause | &#x2714; | |
| Let Clause | &#x2714; | |
| Where Clause | &#x2714; | |
| GroupBy Clause | &#x2714; | |
| OrderBy Clause | &#x2714; | |
| Count Clause | &#x2718; | |
| Return Clause | &#x2714; | |
| Ordered And Unordered Expressions | &#x2718; | |
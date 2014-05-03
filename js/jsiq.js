define(['jsiqparser'], function(parser)
{
	//a flat sequence of items (can't contain other sequences)
	function Sequence(itms)
	{
		this.items = [];
		if (itms)
		{
			for(var i = 0; i < itms.length; ++i)
			{
				this.push(itms[i]);
			}
		}
	}
	
	Object.defineProperties(Sequence.prototype, {
		//add an item to the sequence while insuring the flatness of it all
		push: {
			value: function(itm)
			{
				if (itm instanceof Sequence)
					this.items.push.apply(this.items, itm.items);
				else
					this.items.push(itm);                 
			} 
		},
		//fetches an item safely form a sequence, returns an empty sequence if out of bounds
		at: {
			value: function(idx)
			{
				if (idx < 0 || this.items.length <= idx)
					return new Sequence();
					
				return new Sequence([this.items[idx]]);
			}
		},
		//used for property lookup using the (dot) notation
		lookup: {
			value: function(key)
			{
				return new Sequence(this.items.map(function(itm)
				{
					if (itm === null)
						return null;
					
					return itm[key];
				}).filter(function(itm){ return itm !== undefined; }));
			}
		},
		//used to index (number) all arrays of a sequence
		index: {
			value: function(idx)
			{
				var arrays = this.items.filter(function(itm) { return isArray(itm); });
				return new Sequence(pluck(arrays, idx - 1).filter(function(itm){ return itm !== undefined; }));
			}
		},
		//returns the amounts of items contained in the sequence
		length: {
			value: function()
			{
				return this.items.length;
			}
		},
		//returns whether or not the sequence is empty
		empty: {
			value: function()
			{
				return this.items.length === 0;
			}
		},
		//returns all elements of all arrays in the sequence
		unbox: {
			value: function(idx)
			{
				var arrays = this.items.filter(function(itm) { return isArray(itm); });
				return new Sequence(flatten(arrays));
			}
		},
		//fetches all items in a list or a single item if the sequence only contains one
		value: {
			value: function()
			{
				return this.items;
			}
		},
		single: {
			value: function()
			{
				if (this.empty())
					return null;
				
				if (this.items.length !== 1)
					throw new Error("can't convert sequence of multiple items to a single value");
				
				return this.items[0];
			}
		},
		//interprets the sequence as a boolean
		boolean: {
			value: function()
			{
				if (!this.items.length)
					return false;
				
				if (this.items.length > 1)
					return true;
				
				return !!this.single();
			}
		},
		//interprets the sequence as a string
		string: {
			value: function()
			{
				if (this.items.length === 0)
					return "";
				
				if (this.items.length === 1)
					return this.items[0].toString();
				
				throw new Error("can't convert sequence to string");
			}
		},
		//interprets the sequence as a number
		number: {
			value: function()
			{
				var num = +this.single();
				if (num !== num)
					throw new Error("can't coalesce sequence to number");
				
				return num;
			}
		},
		//converts the sequence to a single atomic value
		atomize: {
			value: function()
			{
				var value = this.single();
				if (value === null || value === undefined)
					return value;

				var type = typeof value;
				switch(type)
				{
					case "number":
					case "string":
					case "boolean":
						return value;
				}
				
				if (value instanceof Date)
					return value.getTime();
				else
					throw new Error("can't atomize sequence of type " + type);
			}
		}
	});
	
	//represents a jsoniq expression
	function Expression(evl)
	{
		this.scope = new Scope();
		
		var self = this;
		this.eval = function()
		{
			var args = Array.prototype.slice.call(arguments);
			args.unshift(self);
			return evl.apply(self, args);
		};
	}
	
	Object.defineProperties(Expression.prototype, {
		//makes all expressions passed as arguments children of this expression with respect to variable scope
		adopt: {
			value: function()
			{
				var children = Array.prototype.slice.call(arguments);
				var self = this;
				children.forEach(function(child)
				{
					child.scope = self.scope.descendant();
				});
			}
		}
	});
	
	//represents nestable expression scopes
	function Scope()
	{
		this.parent = null;
		this.local = {};
	}
	
	Object.defineProperties(Scope.prototype, {
		//binds a name to an expression
		set: {
			value: function(name, value)
			{
				if (value instanceof Expression)
					this.local[name] = value;
				else
					throw new Error('scope value should be an Expression');
			}
		},
		//looks up a name in the scope hierarchy
		lookup: {
			value: function(name)
			{
				var val = this.local[name];
				if (val !== undefined)
					return val;
				
				if (this.parent)
					return this.parent.lookup(name);
				
				return undefined;
			}
		},
		//creates a descendant of this scope
		descendant: {
			value: function()
			{
				var child = new Scope();
				child.parent = this;
				return child;
			}
		},
		//returns a list containing the scope hierarchy in order of the root parent to the current scope
		hierarchy: {
			value: function()
			{
				var hierarch = [this];
				var parent = this.parent;
				while(parent)
				{
					hierarch.push(parent);
					parent = parent.parent;
				}
				return hierarch.reverse();
			}
		},
		//flattens the entire scope hierarchy into a single scope
		flattened: {
			value: function()
			{
				var hierch = this.hierarchy();
				var flat = new Scope();
				
				for(var i = 0; i < hierch.length; ++i)
				{
					var scope = hierch[i];
					for(var prop in scope.local)
					{
						var val = scope.local[prop];
						if (val === undefined)
							continue;
						
						flat.set(prop, val);
					}
				}
				
				return flat;
			}
		},
		//fetches all the names of the expressions bound to this scope (doesn't go up the hierarchy)
		keys: {
			value: function()
			{
				var keys = [];
				for(var prop in this.local)
					keys.push(prop);
				return keys;
			}
		}
	});
	
	//converts an single value into a sequence
	function toseq(itm)
	{
		if  (itm instanceof Sequence)
			return itm;
		
		return new Sequence([itm]);
	}
	
	//converts a single value into an expression
	function atomicexpr(itm)
	{
		var seq = toseq(itm);
		return new Expression(function(self)
		{
			return seq;
		});
	}
	
	parser.yy = {
		parseError : function(msg)
		{
			throw new Error(msg);
		},
		//dictionary of all collections that have been registered
		collections: {},
		
		//all the available functions in scope for jsoniq expressions
		//@params: of type Sequence
		//@returns: either sequences or values. They will be converted
		//	to sequences safely and automatically using toseq
		funcs: {
			//returns the number of elements in a sequence
			count: function(seq)
			{
				if (!(seq instanceof Sequence))
					throw new Error('count can only be applied to a sequence');
				
				return toseq(seq.length());
			},
			//returns the sequence represented by a collection
			collection: function(name)
			{
				var ident = name.string();
				var col = parser.yy.collections[ident];
				if (!col)
					throw new Error("collection " + name + " doesn't exist");
				
				return col;
			}
		},
		
		//internal functions to generate the jsoniq expressions
		//@params: expressions from the parser
		//@return: an expression that returns a sequence, and that accepts itself as a first parameter
		expr: {
			atomic: function(itm)
			{
				return atomicexpr(itm);
			},
			multi: function(exprs)
			{
				return new Expression(function(self)
				{
					var seq = new Sequence();
					exprs.forEach(function(expr)
					{
						self.adopt(expr);
						seq.push(expr.eval());
					});
					return seq;
				});
			},
			empty: function()
			{
				return new Expression(function(self)
				{
					return new Sequence();
				});
			},
			object: function(propvalues)
			{
				return new Expression(function(self)
				{
					var obj = {};
					for(var i = 0; i < propvalues.length; ++i)
					{
						self.adopt(propvalues[i][0], propvalues[i][1]);
						var seqval = propvalues[i][1].eval();
						var prop = propvalues[i][0].eval().string();
						
						if (seqval.empty())
							obj[ prop ] = null;
						else if (seqval.length() === 1)
							obj[ prop ] = seqval.single();
						else
							obj[ prop ] = seqval.items;
					}
				
					return toseq(obj);
				});
			},
			lookup: function(objexpr, nameexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(objexpr, nameexpr);
					return objexpr.eval().lookup(nameexpr.eval().string());
				});
			},
			index: function(arrexpr, idxexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(arrexpr, idxexpr);
					return arrexpr.eval().index(idxexpr.eval().number());
				});
			},
			unbox: function(arrexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(arrexpr);
					return arrexpr.eval().unbox();
				});
			},
			unary_plus: function(valexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(valexpr);
					return toseq(valexpr.eval().number());
				});
			},
			unary_minus: function(valexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(valexpr);
					return toseq(-valexpr.eval().number());
				});
			},
			range: function(minexpr, maxexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(minexpr, maxexpr);
					
					var mins = minexpr.eval(), maxs = maxexpr.eval();
					if (mins.empty() || maxs.empty())
						return new Sequence();
			
					var i = Math.min(mins.number(), maxs.number());
					var lim = Math.max(mins.number(), maxs.number());
					var result = new Sequence();
					for(;i <= lim; ++i)
						result.push(i);
			
					return result;
				});
			},
			plus: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					
					return toseq(oneexpr.eval().number() + twoexpr.eval().number());
				});
			},
			minus: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					
					return toseq(oneexpr.eval().number() - twoexpr.eval().number());
				});
			},
			mod: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					
					return toseq(oneexpr.eval().number() % twoexpr.eval().number());
				});
			},
			div: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					
					return toseq(oneexpr.eval().number() / twoexpr.eval().number());
				});
			},
			mul: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					
					return toseq(oneexpr.eval().number() * twoexpr.eval().number());
				});
			},
			concat: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					
					return toseq(oneexpr.eval().string() + twoexpr.eval().string());
				});
			},
			eq: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					//TODO support element comparison for sequences containing multiple items
					return toseq(oneexpr.eval().single() == twoexpr.eval().single());
				});
			},
			ne: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					//TODO support element comparison for sequences containing multiple items
					return toseq(oneexpr.eval().single() != twoexpr.eval().single());
				});
			},
			lt: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					//TODO support element comparison for sequences containing multiple items
					return toseq(oneexpr.eval().single() < twoexpr.eval().single());
				});
			},
			le: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					//TODO support element comparison for sequences containing multiple items
					return toseq(oneexpr.eval().single() <= twoexpr.eval().single());
				});
			},
			gt: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					//TODO support element comparison for sequences containing multiple items
					return toseq(oneexpr.eval().single() > twoexpr.eval().single());
				});
			},
			ge: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					//TODO support element comparison for sequences containing multiple items
					return toseq(oneexpr.eval().single() >= twoexpr.eval().single());
				});
			},
			and: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					
					return toseq(oneexpr.eval().boolean() && twoexpr.eval().boolean());
				});
			},
			or: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					
					return toseq(oneexpr.eval().boolean() || twoexpr.eval().boolean());
				});
			},
			not: function(oneexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr);
					
					return toseq(!oneexpr.eval().boolean());
				});
			},
			boolean: function(oneexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr);
					
					return toseq(oneexpr.eval().boolean());
				});
			},
			array: function(exprarray)
			{
				return new Expression(function(self)
				{
					if (exprarray.length === 1)
					{
						self.adopt(exprarray[0]);
						var val = exprarray[0].eval();
						if (val.length() !== 1)
							return toseq(val);
					}
					
					return toseq(mapmany(exprarray, function(expr)
					{
						self.adopt(expr);
						
						return expr.eval().items;
					}));
				});
			},
			predicate: function(expr, predicate)
			{
				return new Expression(function(self)
				{
					self.adopt(expr, predicate);
					
					var queried = expr.eval();
					var number = undefined;
					//do it this way as to only swallow the exception of number conversion and nothing else
					try { number = predicate.eval().number(); } catch(e) {}
					
					//if predicate evaluates to an integer, return the item at index
					if (number !== undefined)
						return toseq(queried.at(number - 1));
						
					var results = [];
					var values = queried.items;
					for(var i = 0; i < values.length; ++i)
					{
						predicate.scope.set('$$', atomicexpr(values[i]));
						if (predicate.eval().boolean())
							results.push(values[i]);
					}
				
					return new Sequence(results);
				});
			},
			context: function()
			{
				return new Expression(function(self)
				{
					var expr = self.scope.lookup('$$');
					if (expr === undefined)
						return toseq(undefined);
					
					return expr.eval();
				});
			},
			varref: function(name)
			{
				return new Expression(function(self)
				{
					var expr = self.scope.lookup(name);
					if (expr === undefined)
						return toseq(0);
					
					return expr.eval();
				});
			},
			ifclause: function(conditionexpr, thenexpr, elseexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(conditionexpr, thenexpr, elseexpr);
					
					if (conditionexpr.eval().boolean())
						return thenexpr.eval();
					else
						return elseexpr.eval();
				});
			},
			switchclause: function(conditionexpr, caseexprs, defaultexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(conditionexpr, caseexprs, defaultexpr);
					var cond = conditionexpr.eval().atomize();
					for(var i = 0; i < caseexprs.length; ++i)
					{
						if (caseexprs[i][0].eval().atomize() === cond)
							return caseexprs[i][1].eval();
					}
					
					return defaultexpr.eval();
				});
			},
			invoke: function(name, param_exprs)
			{
				var fun = parser.yy.funcs[name];
				if (!fun)
					throw new Error('function ' + name + ' does not exist');
				
				return new Expression(function(self)
				{
					var args = param_exprs.map(function(expr)
					{
						self.adopt(expr);
						return expr.eval();
					});
					return toseq(fun.apply(null, args));
				});
			},
			flowr: function()
			{
				var clauses = flatten(Array.prototype.slice.call(arguments));
				
				return new Expression(function(self)
				{
					var res = [];
					for(var i = 0; i < clauses.length; ++i)
					{
						res = clauses[i].eval(res, i === 0);
					}
				
					var result = new Sequence();
					for(var i = 0; i < res.length; ++i)
						result.push(res[i]);
				
					return result;
				});
			},
		},
		//expressions defining all flowr clauses
		//contrarily to the expressions above, the returned expressions
		//@params: expressions from the parser
		//@return: an expression that accepts self, a list of incoming scopes and a flag
		//	that specifies if this is the first expression in a flowr expression. It must return
		//	an array of outgoing scopes to be passed to the next flowr expression
		flowr: {
			letclause: function(varref, valueexpr)
			{
				return new Expression(function(self, incoming, first)
				{
					if (first)
						incoming.push(new Scope());
					
					return incoming.map(function(itm)
					{
						var child = itm.descendant();
						child.set(varref, new Expression(function()
						{
							valueexpr.scope = child;
							return valueexpr.eval();
						}));
						return child;
					});
				});
			},
			applyfors: function(fors)
			{
				return new Expression(function(self, incoming, first)
				{
					if (first)
						incoming.push(new Scope());
					
					var outgoing = [];
					for(var i = 0; i < incoming.length; ++i)
					{
						var toprocess = [incoming[i]];
						for(var k = 0; k < fors.length; ++k)
						{
							toprocess = flatten(
								toprocess.map(function(scope)
								{
									return fors[k](scope);
								}));
						}
						outgoing.push(toprocess);
					}
					
					return flatten(outgoing);
				});
			},
			//returns a special function that acts on a single incoming scope
			//the for clause is used in combination with "applyfors" to chain
			//for expressions in the same statement
			forclause: function(varref, allowempty, atref, inexpr)
			{
				//internal function to set the scope variables properly (the value and positional variables)
				function init_scope(scope, idx, value)
				{
					scope.set(varref, new Expression(function()
						{
							return toseq(value);
						}));
				
					if (atref)
					{
						scope.set(atref, new Expression(function()
							{
								return toseq(idx);
							}));
					}
				}
				
				return function(scope)
				{
					var results = [];
					inexpr.scope = scope;
					var values = inexpr.eval().items;
					for(var k = 0; k < values.length; ++k)
					{
						var creation = scope.descendant();
						
						init_scope(creation, k + 1, values[k]);
						
						results.push(creation);
					}
					
					if (allowempty && values.length === 0)
					{
						var creation = scope.descendant();

						init_scope(creation, 0, null);

						results.push(creation);
					}
					
					return results;
				}	
			},
			whereclause: function(conditionexpr)
			{
				return new Expression(function(self, incoming)
				{
					return incoming.filter(function(scope)
					{
						conditionexpr.scope = scope;
						
						return conditionexpr.eval().boolean();
					});
				});		
			},
			orderbyclause: function(comparisons)
			{
				return new Expression(function(self, incoming)
				{
					return incoming.slice().sort(function(scopeone, scopetwo)
					{
						for(var i = 0; i < comparisons.length; ++i)
						{
							var comp = comparisons[i](scopeone, scopetwo);
							if (comp !== 0)
								return comp;
						}
						
						return 0;
					});
				});
			},
			//returns a special function that acts one two incoming scopes to order them
			//it is used in combination with "orderbyclause" to chain
			//orderby expressions in the same statement
			orderbycomparison: function(atomicexpr, ascending, emptyleast, collation)
			{
				//return comparison function for two incoming scopes
				return function(scopeone, scopetwo)
				{
					atomicexpr.scope = scopeone;
					var atomone = atomicexpr.eval().atomize();
					
					atomicexpr.scope = scopetwo;
					var atomtwo = atomicexpr.eval().atomize();
					
					if (atomone === null && atomtwo === null)
						return 0;
					
					var val = 0;
					if (atomone === null)
						val = emptyleast ? -1 : 1;
					else if (atomtwo === null)
						val = emptyleast ? 1 : -1;
					else if (atomone < atomtwo)
						val = -1;
					else if (atomone === atomtwo)
						val = 0;
					else if (atomone > atomtwo)
						val = 1;
					else
						throw new Error('failed comparing: ' + atomone + ' with ' + atomtwo);
					
					return ascending ? val : -val;
				};
			},
			groupbyclause: function(groupings) //groupings is an array of [group_name, group_value_expr]
			{
				return new Expression(function(self, incoming)
				{
					var groups = {};
					
					//partition the incoming scopes with respect to the group by property
					for(var i = 0; i < incoming.length; ++i)
					{
						var scope = incoming[i];
						var key = groupings.map(function(grp)
						{
							var value = grp[1];
							value.scope = scope;
							return value.eval().atomize();
						}).join(';');
						
						var arr = groups[key];
						if (!arr)
							groups[key] = arr = [];

						arr.push(scope);
					}
					
					//create the aggregated outgoing scope for each group
					var outgoing = [];
					for(var groupkey in groups)
					{
						var grouped = groups[groupkey];
						var out = new Scope();
						var flat = grouped.map(function(itm){ return itm.flattened(); });
						
						flat[0].keys().forEach(function(key)
						{
							var exprs = flat.map(function(scope)
							{
								return scope.lookup(key);
							});
							
							var seq = new Sequence();
							exprs.forEach(function(expr)
							{
								seq.push(expr.eval());
							});
							
							out.set(key, atomicexpr(seq));
						});
						
						//set the group specific variables for the outgoing scope
						groupings.forEach(function(name_expr)
						{
							name_expr[1].scope = flat[0];
							out.set(name_expr[0], atomicexpr(name_expr[1].eval().atomize()));
						});
						
						outgoing.push(out);
					}
					
					return outgoing;
				});
			},
			//converts all the outgoing scopes at the end of a flowr expression
			//to sequences that can be used in the expr functions
			returnclause: function(retexpr)
			{
				return new Expression(function(self, incoming)
				{
					return incoming.map(function(scope)
					{
						retexpr.scope = scope;
						return retexpr.eval();
					});
				});		
			},
		},
	};
	
	//helper functions to remove lodash dependency
	
	var isArray = Array.isArray || function(arr) {
		return Object.prototype.toString.call(arr) == '[object Array]';
	}
	
	function mapmany(source, fun)
	{
		var dest = [];
		for(var i = 0; i < source.length; ++i)
		{
			var res = fun(source[i]);
			for(var j = 0; j < res.length; ++j)
			{
				dest.push(res[j]);
			}
		}
		return dest;
	}
	
	//flattens arrays recursively
	function flatten(arr, flat)
	{
		flat = flat || [];
		for(var i = 0; i < arr.length; ++i)
		{
			var val = arr[i];
			if (isArray(val))
				flatten(val, flat);
			else
				flat.push(val);
		}
		return flat;
	}
	
	//fetches all the key values from an array of objects
	function pluck(arr, key)
	{
		return arr.map(function(itm)
		{
			return itm[key];
		});
	}
	
	return {
		//parses a jsoniq expression and returns either a single value, or an array of values
		//not sure if we should return a sequence here or some sort of wrapper class
		//to aide the user in determining what type of result the expression yielded
		query: function(input)
		{
			return parser.parse(input).eval().value();
		},
		
		//registers a named collection that can be queried by expressions passed to the parse function
		collection: function(name, items)
		{
			if (!isArray(items))
				throw new Error('collection must be an array');
			
			parser.yy.collections[name] = new Sequence(items);
		},
		
		//registers a function that can be called by a jsoniq expression
		//functions can accept an arbitrary number of parameters (values, not sequences)
		//and return a value
		func: function(name, fun)
		{
			parser.yy.funcs[name] = function()
			{
				var argvals = Array.prototype.slice.call(arguments).map(function(itm){ return itm.value(); });
				return fun.apply(undefined, argvals);
			};
		}
	};
});

define(['lodash', 'parser'], function(_, parser)
{
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
		push: {
			value: function(itm)
			{
				if (itm instanceof Sequence)
					this.items.push.apply(this.items, itm.items);
				else
					this.items.push(itm);                 
			} 
		},
		at: {
			value: function(idx)
			{
				return this.items[idx];
			}
		},
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
		index: {
			value: function(idx)
			{
				var arrays = this.items.filter(function(itm) { return _.isArray(itm); });
				return new Sequence(_.pluck(arrays, idx - 1).filter(function(itm){ return itm !== undefined; }));
			}
		},
		unbox: {
			value: function(idx)
			{
				var arrays = this.items.filter(function(itm) { return _.isArray(itm); });
				return new Sequence(_.flatten(arrays));
			}
		},
		value: {
			value: function()
			{
				if (this.items.length === 1)
					return this.items[0];
				
				return this.items;
			}
		},
		boolean: {
			value: function()
			{
				if (!this.items.length)
					return false;
				
				return !!this.value();
			}
		},
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
		length: {
			value: function()
			{
				return this.items.length;
			}
		},
		empty: {
			value: function()
			{
				return this.items.length === 0;
			}
		},
		number: {
			value: function()
			{
				if (this.items.length !== 1)
					throw new Error("can't convert sequence that doesn't have one element to a number");
				
				var num = +this.items[0];
				if (num !== num)
					throw new Error("can't coalesce sequence to number");
				
				return num;
			}
		},
		atomize: {
			value: function()
			{
				if (this.empty())
					return null;
				
				var value = this.value();
				var type = typeof value;
				switch(type)
				{
					case "number":
					case "string":
					case "boolean":
					case "undefined":
						return value;
				}
				if (value === null)
					return value;
				else
					throw new Error("can't atomize sequence of type " + type);
			}
		}
	});
	
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
	
	function Scope()
	{
		this.parent = null;
		this.local = {};
	}
	
	Object.defineProperties(Scope.prototype, {
		set: {
			value: function(name, value)
			{
				if (value instanceof Expression)
					this.local[name] = value;
				else
					throw new Error('scope value should be an Expression');
			}
		},
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
		childof: {
			value: function(parentexpr)
			{
				if (!parentexpr)
					return;
				
				this.parent = parentexpr.scope;
			}
		},
		descendant: {
			value: function()
			{
				var child = new Scope();
				child.parent = this;
				return child;
			}
		},
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
		flattened: {
			value: function()
			{
				var hierch = this.hierarchy();
				var flat = new Scope();
				
				for(var i = 0; i < hierch.length; ++i)
				{
					for(var prop in this.local)
					{
						var val = this.local[prop];
						if (val === undefined)
							continue;
						
						flat.set(prop, val);
					}
				}
				
				return flat;
			}
		},
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
	
	function toseq(itm)
	{
		if  (itm instanceof Sequence)
			return itm;
		
		return new Sequence([itm]);
	}
	
	function atomicexpr(itm)
	{
		var seq = toseq(itm);
		return new Expression(function(self)
		{
			return seq;
		});
	}
	
	var globalscope = [];
	parser.yy = {
		parseError : function(msg)
		{
			throw new Error(msg);
		},
		funcs: {
			count: function(seq)
			{
				if (!(seq instanceof Sequence))
					throw new Error('count can only be applied to a sequence');
				
				return seq.length();
			}
		},
		expr: {
			atomic: function(itm)
			{
				return atomicexpr(itm);
			},
			multi: function(exprs)
			{
				return new Expression(function(self)
				{
					return new Sequence(exprs.map(function(expr)
					{
						self.adopt(expr);
						return expr.eval().value();
					}));
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
						obj[ propvalues[i][0].eval().string() ] = propvalues[i][1].eval().value();
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
					return arrexpr.eval().index(idxexpr.eval().value());
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
					
					return toseq(oneexpr.eval().value() == twoexpr.eval().value());
				});
			},
			ne: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					
					return toseq(oneexpr.eval().value() != twoexpr.eval().value());
				});
			},
			lt: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					
					return toseq(oneexpr.eval().value() < twoexpr.eval().value());
				});
			},
			le: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					
					return toseq(oneexpr.eval().value() <= twoexpr.eval().value());
				});
			},
			gt: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					
					return toseq(oneexpr.eval().value() > twoexpr.eval().value());
				});
			},
			ge: function(oneexpr, twoexpr)
			{
				return new Expression(function(self)
				{
					self.adopt(oneexpr, twoexpr);
					
					return toseq(oneexpr.eval().value() >= twoexpr.eval().value());
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
					
					return toseq(exprarray.map(function(expr)
					{
						self.adopt(expr);
						
						return expr.eval().value();
					}));
				});
			},
			predicate: function(expr, predicate)
			{
				return new Expression(function(self)
				{
					self.adopt(expr, predicate);
					
					var queried = expr.eval();
					var number = predicate.eval().value();
					if (typeof number === "number" && number % 1 === 0)
						return toseq(queried.index(number)); //if predicate evaluates to an integer, return the item at index

					var results = [];
					var values = queried.value();
					for(var i = 0; i < values.length; ++i)
					{
						predicate.scope.set('$$', atomicexpr(values[i]));
						if (predicate.eval().boolean())
							results.push(values[i]);
					}
					
					return toseq(results);
				});
			},
			context: function()
			{
				return new Expression(function(self)
				{
					var expr = self.scope.lookup('$$');
					if (expr === undefined)
						return toseq(0);
					
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
				if (!parser.yy.funcs[name])
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
				var clauses = _.flatten(Array.prototype.slice.call(arguments));
				
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
		//flowr clauses are expressions that return an array of context variables, or undefined to just pass
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
			forclause: function(varref, allowempty, atref, inexpr)
			{
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
				
				return new Expression(function(self, incoming, first)
				{
					if (first)
						incoming.push(new Scope());
					
					var results = [];
					for(var i = 0; i < incoming.length; ++i)
					{
						inexpr.scope = incoming[i];
						var values = inexpr.eval().items;
						for(var k = 0; k < values.length; ++k)
						{
							var creation = incoming[i].descendant();
							
							init_scope(creation, k + 1, values[k]);
							
							results.push(creation);
						}
					}
					
					if (allowempty && values.length === 0)
					{
						for(var i = 0; i < incoming.length; ++i)
						{
							var creation = incoming[i].descendant();

							init_scope(creation, 0, null);

							results.push(creation);
						}
					}
					
					return results;
				});		
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
	
	return {
		parse: function(input)
		{
			return parser.parse(input);
		}
	};
});

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
			value: function(itm)
			{
				return new Sequence(_.pluck(this.items, itm).filter(function(itm){ return itm !== undefined; }));
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
		}
	});
	
	function Expression(evl)
	{
		this.parent = null;
		this.scope = {};
		
		var self = this;
		this.eval = function()
		{
			return evl(self);
		};
	}
	
	Object.defineProperties(Expression.prototype, {
		lookup: {
			value: function(name)
			{
				var val = this.scope[name];
				if (val !== undefined)
					return val;
				
				if (this.parent)
					return this.parent.lookup(name);
				
				return undefined;
			}
		},
		adopt: {
			value: function()
			{
				var children = Array.prototype.slice.call(arguments);
				var self = this;
				children.forEach(function(child)
				{
					child.parent = self;
				});
			}
		},
	});
	
	function toseq(itm)
	{
		if  (itm instanceof Sequence)
			return itm;
		
		return new Sequence([itm]);
	}
	
	function toatomic(itm)
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
		expr: {
			atomic: function(itm)
			{
				return toatomic(itm);
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
						predicate.scope['$$'] = toatomic(values[i]);
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
					if (!self.parent)
						throw new Error('invalid use of context variable without parent');
					
					var expr = self.parent.lookup('$$');
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
			}
		}
	};
	
	return {
		parse: function(input)
		{
			return parser.parse(input);
		}
	};
});

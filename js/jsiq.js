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
		getitems: {
			value: function()
			{
				return this.items;
			}
		},
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
	
	function Expression(scope, evl)
	{
		this.scope = scope.reverse();
		this.eval = evl;
	}
	
	function toseq(itm)
	{
		if  (itm instanceof Sequence)
			return itm;
		
		return new Sequence([itm]);
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
				var seq = toseq(itm);
				return new Expression(globalscope.slice(), function()
				{
					return seq;
				});
			},
			multi: function(exprs)
			{
				return new Expression(globalscope.slice(), function()
				{
					return new Sequence(exprs.map(function(expr)
					{
						return expr.eval().value();
					}));
				});
			},
			empty: function()
			{
				return new Expression(globalscope.slice(), function()
				{
					return new Sequence();
				});
			},
			object: function(propvalues)
			{
				return new Expression(globalscope.slice(), function()
				{
					var obj = {};
					for(var i = 0; i < propvalues.length; ++i)
					{
						obj[ propvalues[i][0].eval().string() ] = propvalues[i][1].eval().value();
					}
				
					return toseq(obj);
				});
			},
			lookup: function(objexpr, nameexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return objexpr.eval().lookup(nameexpr.eval().string());
				});
			},
			index: function(arrexpr, idxexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return arrexpr.eval().index(idxexpr.eval().value());
				});
			},
			unbox: function(arrexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return arrexpr.eval().unbox();
				});
			},
			unary_plus: function(valexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(valexpr.eval().number());
				});
			},
			unary_minus: function(valexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(-valexpr.eval().number());
				});
			},
			range: function(minexpr, maxexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
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
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().number() + twoexpr.eval().number());
				});
			},
			minus: function(oneexpr, twoexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().number() - twoexpr.eval().number());
				});
			},
			mod: function(oneexpr, twoexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().number() % twoexpr.eval().number());
				});
			},
			div: function(oneexpr, twoexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().number() / twoexpr.eval().number());
				});
			},
			mul: function(oneexpr, twoexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().number() * twoexpr.eval().number());
				});
			},
			concat: function(oneexpr, twoexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().string() + twoexpr.eval().string());
				});
			},
			eq: function(oneexpr, twoexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().value() == twoexpr.eval().value());
				});
			},
			ne: function(oneexpr, twoexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().value() != twoexpr.eval().value());
				});
			},
			lt: function(oneexpr, twoexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().value() < twoexpr.eval().value());
				});
			},
			le: function(oneexpr, twoexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().value() <= twoexpr.eval().value());
				});
			},
			gt: function(oneexpr, twoexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().value() > twoexpr.eval().value());
				});
			},
			ge: function(oneexpr, twoexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().value() >= twoexpr.eval().value());
				});
			},
			and: function(oneexpr, twoexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().boolean() && twoexpr.eval().boolean());
				});
			},
			or: function(oneexpr, twoexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().boolean() || twoexpr.eval().boolean());
				});
			},
			not: function(oneexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(!oneexpr.eval().boolean());
				});
			},
			boolean: function(oneexpr)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(oneexpr.eval().boolean());
				});
			},
			array: function(exprarray)
			{
				return new Expression(globalscope.slice(), function()
				{
					return toseq(exprarray.map(function(expr)
					{
						return expr.eval().value();
					}));
				});
			},
		}
	};
	
	return {
		parse: function(input)
		{
			return parser.parse(input);
		}
	};
});

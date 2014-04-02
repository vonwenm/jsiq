define(['lodash', 'parser'], function(_, parser)
{
	function Sequence(itms)
	{
		this.items = itms || [];
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
		        {
		            this.items.push.apply(this.items, itm.items);
		            return;
		        }
		        
		        this.items.push(itm);                 
		    } 
		},
		at: {
		    value: function(idx)
		    {
		        return this.items[idx];
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
	
	function toseq(itm)
	{
		if  (itm instanceof Sequence)
			return itm;
		
		return new Sequence([itm]);
	}
	
	parser.yy = {
		seq: function()
		{
			return _.reduce(arguments, function(seq, itm)
			{
				seq.push(itm);
				return seq;
			}, new Sequence());
		},
		range: function(min, max)
		{
			var mins = toseq(min);
			var maxs = toseq(max);
			if (mins.empty() || maxs.empty())
				return new Sequence();
			
			var i = Math.min(mins.number(), maxs.number());
			var lim = Math.max(mins.number(), maxs.number());
			var result = new Sequence();
			for(;i <= lim; ++i)
				result.push(i);
			
			return result;
		},
		parseError : function(msg)
		{
			throw new Error(msg);
		}
	};
	
	return {
		parse: function(input)
		{
			return parser.parse(input);
		}
	};
});

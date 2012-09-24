view = Backbone.View.extend();

view.prototype.events = {
    'change select': 'update',
    'keyup input': 'update',
    'keyup textarea': 'update',
    'change input': 'update',
    'change textarea': 'update'
};

view.prototype.initialize = function(options) {
    _(this).bindAll('render', 'attach', 'update');
    this.render().attach();
};

view.prototype.render = function() {
    if (this.$('.tooltips').size()) return this;
    this.$('.content').html(templates.Tintplates(this.model));
    return this;
};

view.prototype.attach = function() {
    var id = this.$('select').val();
    var layer = this.model.get('Layer').get(id);

    // If no layer hide tokens.
    if (!layer) {
        this.$('.tokens').empty();
        this.$('.requires-tokens').attr('disabled', true);
        return true;
    }

    var update = _(function(model) {
        var fields = _(model.get('fields')).keys();
        this.$('.tokens').html( '<code>&lt;table&gt;</code><br/>' + _(fields).map(function(f) {
            return '<code>{{#' + f + '}}&lt;tr&gt;&lt;td&gt;' + f + '&lt;/td&gt;&lt;td&gt;{{{' + f + '}}}&lt;/td&gt;&lt;/tr&gt;{{/' + f + '}}</code>';
        }).join('<br/>') + '<br/><code>&lt;/table&gt;</code>' );
        this.$('.requires-tokens').attr('disabled', false);
        $(this.el).removeClass('loading').removeClass('restartable');
        this.$('.sendmetable').val( '<table>' + _(fields).map(function(f) {
            return '{{#' + f + '}}<tr><td>' + f + '</td><td>{{{' + f + '}}}</td></tr>{{/' + f + '}}';
        }).join(' ') + '</table>' ).change( );
    }).bind(this);

    // Cache the datasource model to `this.datasource` so it can
    // be used to live render/preview the formatters.
    if (!this.datasource || this.datasource.id !== layer.get('id')) {
        $(this.el).addClass('loading').addClass('restartable');
        //console.log(layer);
        //console.log(layer.get('srs'));
        var attr = _(layer.get('Datasource')).chain()
            .clone()
            .extend({
                id: layer.get('id'),
                project: this.model.get('id'),
                // millstone will not allow `srs` be undefined for inspection so we set
                // it to null. We could use the layer's SRS, but this likely has fewer
                // side effects.
                srs: layer.get('srs')
            })
            .value();
        this.datasource = new models.Datasource(attr);
        this.datasource.fetchFeatures({
            success: update,
            error: _(function(model, err) {
                if ($(this.el).hasClass('restarting')) return false;
                $(this.el).removeClass('loading').removeClass('restartable');
                new views.Modal(err);
            }).bind(this)
        });
    } else {
        update(this.datasource);
    }
};

view.prototype.update = function(ev) {
    var target = $(ev.currentTarget);
    var key = target.attr('name');
    var deepSet = function(attr, keys, val) {
        if (!keys.length) return val;
        var key = keys.shift();
        attr[key] = deepSet(attr[key]||{}, keys, val);
        return attr;
    };
    if (!key) return;
    if (key === 'interactivity.layer') this.attach();

    var attr = {
        legend: this.model.get('legend') || '',
        interactivity: _({}).extend(this.model.get('interactivity'))
    };
    this.model.set(deepSet(attr, key.split('.'), target.val()));
};

// Hook in to project view with an augment.
views.Project.augment({
    events: { 'click a[href=#tintplates]': 'tintplates' },
    tintplates: function() {
        new view({ model: this.model, el:$('#drawer') })
    },
    render: function(p) {
        p.call(this);
        this.$('.palette').prepend("<a class='drawer' href='#tintplates' title='Auto-Table'><span class='icon reverse sqlite'>Tintplates</span></a>");
        return this;
    }
});


var dragSrcEl = null;


function handleDragOver(e) {
  if (e.preventDefault) { e.preventDefault(); }
  return false;
}

function addOne(deck) {
  var card = $("#cardlist option:selected").data('card');
  
  if(!card) {
    // nothing selected...
    return false;
  }
  
  var types = [
    ["Planeswalker", "planeswalkers"],
    ["Creature",     "creatures"],
    ["Artifact",     "artifacts"],
    ["Enchantment",  "enchantments"],
    ["Land",         "lands"],
  ]

  for(var i = 0; i < types.length; i++) {
    if (card.types.indexOf(types[i][0]) >= 0) {
      deck.addCard(card, types[i][1]);
      return false;
    }
  }

  deck.addCard(card, "spells");
  return false;
}

function addFour(deck) {
  for(var i = 0; i < 4; i++) { addOne(deck); }
  return false;
}

function Storage() { }
Storage.prototype.read = function() {
  if (window.localStorage.decks) {
    return JSON.parse(window.localStorage.decks);
  } else {
    return JSON.parse('[{"name":"Sample Deck","creatures":[270959,270959,270959,270959,373541,373541,373541,373541,368961,253624,253624,253624,253624,369030,366328,366310,366239,378524],"spells":[373575,373575,373575,373575,370609,370609,373639,373639,373639,373639,373701,366379],"artifacts":[373709,373544,290542],"enchantments":[373715,373715,253507],"lands":[370733,373734,369058,373608,373608,373608,373608,373608,373608,373608,373608,373608,373608,373608,373608,373608,373608,373608,373608,373595,373595,373595,373595,373595,373595,373595,373595],"planeswalkers":[370728]}]');
  }
}
Storage.prototype.write = function(data) {
  window.localStorage.decks = JSON.stringify(data);
}

var storage = new Storage();

var mvidToCards = {};

function addDeckList(savedDecks, form) {
  var select = $("select", form);
  select.empty();
  
  // Default empty option
  select.append($('<option></option>'));

  $.each(savedDecks, function(i, deck) {
    select.append($('<option></option>')
        .attr('value', deck['name']).text(deck['name']));
  });
}

function saveDeck(storage, deck, name) {
  var decks = storage.read();
  var existingDeck = decks.filter(function(storedDeck) {
    return storedDeck.name == name;
  })[0];

  var mvidfun = function(x) { return x.multiverseid; };
  var storedDeck = {}

  if (existingDeck) { storedDeck = existingDeck }

  storedDeck.name = name;
  deck.rowTypes.forEach(function(type) {
    storedDeck[type] = deck[type]().map(mvidfun);
  });

  if (!existingDeck) { decks.push(storedDeck); }
  addDeckList(decks, $("#deck-controls"));
  storage.write(decks);
}

function loadDeck(storage, name, table, mvidToCards) {
  var deck = storage.read().filter(function(storedDeck) {
    return storedDeck.name == name;
  })[0];

  var resolved = {};

  for (var section in table.cardColumns) {
    resolved[section] = (deck[section] || []).map(function(mvid) {
      return mvidToCards[mvid];
    });
  }
  table.setDeck(resolved)
}

function drawColorDistribution(deck) {
  var colorDist = deck.colorDistribution();
  var colors = {
    'Red': 'Red',
    'Blue': 'Blue',
    'Black': 'Black',
    'White': 'Purple',
    'Green': 'Green'
  };
  var data = google.visualization.arrayToDataTable(
      [['Color', 'Number of Cards']].concat(colorDist)
      );

  var options = {
    title: 'Card Color Distribution',
    slices: colorDist.map(function(d) { return { color: colors[d[0]] }; }),
    legend: { position: 'bottom' }
  };

  var chart = new google.visualization.PieChart(document.getElementById('colordist'));
  chart.draw(data, options);
}

function drawSymbolDistribution(deck) {
  var symbolDist = deck.symbolDistribution();
  var colors = {
    'R': 'Red',
    'U': 'Blue',
    'B': 'Black',
    'W': 'Purple',
    'G': 'Green'
  };

  var data = google.visualization.arrayToDataTable(
      [['Symbol', 'Number of Cards']].concat(symbolDist)
      );

  var options = {
    title: 'Card Symbol Distribution',
    slices: symbolDist.map(function(d) { return { color: colors[d[0]] }; }),
    legend: { position: 'bottom' }
  };

  var chart = new google.visualization.PieChart(document.getElementById('symboldist'));
  chart.draw(data, options);
}

function drawCardTypeDistribution(deck) {
  var colorDist = deck.cardTypeDistribution();

  var data = google.visualization.arrayToDataTable(
      [['Type', 'Number of Cards']].concat(colorDist)
      );

  var options = {
    title: 'Card Type Distribution',
    legend: { position: 'bottom' }
  };

  var chart = new google.visualization.PieChart(document.getElementById('cardtypedist'));
  chart.draw(data, options);
}

function drawFirstHandProbability(deck) {
  var firstHandProb = deck.firstHandProbability();
  var table = $('#firsthandlist');
  
  $.each(firstHandProb, function(i, val) {
    table.append($('<tr></tr>').append(
        $('<td></td>').addClass('cardname').text(val[0]),
        $('<td></td>').addClass('probability').text(
            (val[1] * 100).toFixed(2) + "%")));        
  });
}

function drawManaCurve(deck) {
  var dataArry = [
      ['Casting Cost', 'Creatures', 'Spells', 'Artifacts', 'Enchantments', 'Planeswalkers']].concat(deck.manaDistribution());
  var data = google.visualization.arrayToDataTable(dataArry);

  var options = {
    title: 'Mana Curve',
    isStacked: true,
    legend: { position: 'bottom' },
    hAxis: {title: 'Converted Mana Cost', titleTextStyle: {color: 'red'}}
  };

  var chart = new google.visualization.ColumnChart(document.getElementById('manacurve'));
  chart.draw(data, options);
}

function downloadDecks(deck) {
  var decks = storage.read();
  var allIds = _.uniq(_.flatten(decks.map(function(thisDeck) {
    return deck.rowTypes.map(function(type) {
      return thisDeck[type];
    });
  })));

  var cards = allIds.map(function(id) { return _.clone(mvidToCards[id]); });
  cards.forEach(function(card) { delete card["imgUrl"]; });
  return {
    "decks": decks,
    "cards": cards
  };
}

$(document).ready(function() {
  var deck = new Table($("div.deck")[0]);
  var trash = document.querySelector('div.trash');
  
  trash.addEventListener('dragover', handleDragOver, false);
  trash.addEventListener('drop', function (e) {
    if (e.stopPropagation) { e.stopPropagation(); }
    deck.removeCard(dragSrcEl);
    return false;
  }, false);
  
  $("#addone").click(function() { return addOne(deck); });
  $("#addfour").click(function() { return addFour(deck); });
  $("#download").click(function() {
    var download = downloadDecks(deck);
    var dlstr = "data:application/octet-stream;charset=utf-8," +
      encodeURIComponent(JSON.stringify(download));
    this.href = dlstr;
    this.download = "decks.json"
    return true;
  });

  $("#simulate").click(function() {
    var simulator = new Simulator(deck.cards());
    var source   = $("#simulate-firstentry-template").html();
    var firstRow = Handlebars.compile(source);

    var source   = $("#simulate-entry-template").html();
    var rowTemplate = Handlebars.compile(source);
    var dest   = $("#simulation > tbody");


    var counts = {};
    simulator.cards.forEach(function(card) {
      if(!card.land) {
        counts[card.multiverseid] = 0;
      }
    });

    for(var handSize = 7; handSize < 12; handSize++) {
      console.log("start");
      var itrnum = 100000;
      var playCount = simulator.simulate(handSize, itrnum, _.clone(counts));
      console.log("finish");

      var keys = _.sortBy(_.keys(playCount), function(key) { return playCount[key]; });
      keys.forEach(function(key) {
        var card = mvidToCards[key];
        var rows = $("tr[data-multiverseid=" + card.multiverseid +"]", dest);
        if (rows.length > 0) {
          var row = rowTemplate({ "percentage": (playCount[key] / itrnum),
                          "multiverseid": card.multiverseid,
                          "handSize": handSize });
          rows.last().after(row);
          $("td.spanner").attr("rowspan", rows.length + 1);
        } else {
          var row = firstRow({ "name": card.name,
                               "percentage": (playCount[key] / itrnum),
                               "manaCost": card.manaCost,
                               "multiverseid": card.multiverseid,
                               "handSize": handSize });
          dest.append(row);
        }
      });
    }
    return false;
  });

  $("#load").click(function() {
    var deckName = $("select", $(this).parents("form")).val();
    if (deckName != '') {
      deck.clear();
      loadDeck(storage, deckName, deck, mvidToCards);
    }
    return false;
  });

  $("#new").click(function() {
    deck.clear();
    var form = $(this).parents("form");
    $("select", form).val('');
    $("input", form).val('');
    return false;
  });

  $("#save").click(function() {
    var form = $(this).parents("form");
    var selectName = $("select", form).val();
    var textName   = $("input", form).val();

    var deckName = null;

    if (selectName == "" && textName == "") {
      deckName = "New Deck";
    } else if (selectName == "" || textName != "") {
      deckName = textName;
    } else {
      deckName = selectName;
    }

    saveDeck(storage, deck, deckName);
    $("select", form).val(deckName);
    $("input", form).val('');
    return false;
  });

  addDeckList(storage.read(), $("#deck-controls")); 

  $.getJSON("allsets.json", function(data) {
    var cards = ["BNG", "THS", "M14", "DGM", "GTC", "RTR"].reduce(function(prev, curr) {
      return prev.concat(data[curr].cards);
    }, []).sort(function(a,b) {
      if (a.name > b.name) return 1;
      if (a.name < b.name) return -1;
      return 0;
    });
    
    var options = $.map(cards, function(card) {
        return $('<option></option>')
            .attr('value', card.multiverseid)
            .text(card.name)            
            .data('card', card);        
    });    
    
    $('#cardlist').append(options);
            
    $.each(data, function(key, set) {
        $.each(set.cards, function(i, card) {
            card.imgUrl = "http://gatherer.wizards.com/Handlers/Image.ashx?multiverseid=" + card.multiverseid + "&type=card";
            mvidToCards[card.multiverseid] = card;
        });
    });
            
    $("form input[name='filter']").change(function () {
      var val = $(this).val();      
      var found = options;
      
      if (val != "") {
        found = options.filter(function(option) {           
          var txt = option.text().toLowerCase();
          return txt.indexOf(val) > -1;
        });
      }

      $('#cardlist option').detach(); // keep data
      $('#cardlist').append(found);
      
    }).keyup( function () { $(this).change(); });

    //
    // handler for color filters
    $('.color-filter').click(function(e){ 
      var color = $(e.target).attr('name').toLowerCase(); 
      $.each(cards, function(i, card) {
        if(card.colors){
          for(var i=0; i< card.colors.length; i++){
            if(card.colors[i].toLowerCase() === color) {
              $('#cardlist option[value="' + card.multiverseid + '"]').prop('disabled', !e.target.checked); 
            }
          }
        }
      });
    });

    $("#cardlist").change(function(data) {
      var card = $("#cardlist option:selected").data('card');
            
      if(!card) {
        // nothing selected...
        return;
      }
      
      $('#preview')
        .attr('src', card.imgUrl)
        .on('dragstart', function(e) {
            this.style.opacity = "0.4";
            dragSrcEl = this;
            e.originalEvent.dataTransfer.effectAllowed = "move";
        })
        .on('dragend', function(e) {
            this.style.opacity = "1.0";
        });                  
    });
  });
});

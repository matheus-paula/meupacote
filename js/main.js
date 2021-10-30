var map;
const popup = new ol.Overlay({
  element: document.getElementById('popup'),
  positioning: 'bottom-center',
  stopEvent: false,
});
const showVersion = function(response){
  $("#appVersion").text(response[0].tag_name);
}
const showWarning = function(title, text){
  var warningModal = $('#warningModal');
  warningModal.find(".modal-title").text(title);
  warningModal.find(".modal-body").text(text);
  warningModal.modal('show');
}
const notNull = function(v){
  return (v!== null && v !== undefined) ? v : "";
}
const exists = function(o){
  return (typeof o === 'undefined' || o === null) ? false:true;
}
const populateError = function(event){
  return "<div class=\"card text-left\"><div class=\"card-header\">"+event.numero+"</div><div class=\"card-body\"><h5 class=\"card-title mb-4\"></h5><div class=\"eventos\">"+"<div class=\"error_event card mb-2\"><div class=\"card-body\"><div class=\"status_icon\" style=\"background-position:33px -98px\"></div><h6>"+event.categoria.split(":")[1].trim()+"</h6><div></div></div></div></div></div>";
}
const populateStatus = function(event){
  return "<div data-event=\""+event.tipo+event.status+"\" class=\"status_event card mb-2\"><div class=\"card-body justify-content-between d-flex\"><div><div class=\"status_icon\" style=\"background-position:"+statusCodeIcon(event.tipo,event.status)+"\"></div><h6>"+event.descricao+"</h6><div class=\"fromto_desc\">"+(event.unidade !== undefined ? "<span>De: </span><span>"+event.unidade.local+"</span>" : "")+(event.unidade.endereco.cep !== undefined ? "<div><span>Endereço: </span><span>"+event.unidade.endereco.bairro+" - "+event.unidade.endereco.uf+" | "+event.unidade.endereco.cep+" | "+event.unidade.endereco.logradouro+"</span></div>" : "")+"</div>"+
    (event.destino !== undefined ? "<div class=\"fromto_desc\"><span>Para: </span><span>"+event.destino[0].local+"</span>"+(event.destino[0].endereco.cep !== undefined ? "<div><span>Endereço: </span><span>"+notNull(event.destino[0].endereco.bairro)+" - "+notNull(event.destino[0].endereco.uf)+" | "+notNull(event.destino[0].endereco.cep)+" | "+notNull(event.destino[0].endereco.logradouro)+"</span></div>" : "")+"</div>":"")+"</div>"+(exists(ol) ? "<div class=\"showMap\" data-end=\""+notNull(event.unidade.endereco.cep)+" "+notNull((event.unidade.endereco.cep == null || event.unidade.endereco.cep == undefined) ? event.unidade.local :"")+" "+notNull(event.unidade.endereco.bairro)+" "+notNull(event.unidade.endereco.localidade)+"\"></div>":"")+"</div><div class=\"card-footer text-muted d-flex\"><span class=\"clock\"></span>"+event.data+" - "+event.hora+"</div></div>";        
}
const getData = function(rastreio){
  $("header").addClass("top");
  $(".loading-animation").addClass("visible");
  $.ajax({
      type: "POST",
      url: "https://correios.contrateumdev.com.br/api/rastreio",
      data: JSON.stringify({"code":rastreio.replace(/ /g,''),"type":"LS"}),
      dataType:"json",
      contentType: 'application/json',
      success: function(response){
          $("#rastreios").fadeIn('100');
          populateResult(response);
          $(".loading-animation").removeClass("visible");                                        
      },error: function(){
        showWarning("Erro no Servidor","Erro na aquisição dos dados de rastreio da encomenda na api do serviço.");
      }
  });
}
const getVersion = function(){
  $.ajax({
      type: "GET",
      url: "https://api.github.com/repos/matheuspaula19/meupacote/releases",
      success: function(response){
        showVersion(response)
      }
  });
}
const getLocation = function(q){
  $('#mapModal').modal('show');
    $.ajax({
        type: "GET",
        url: "https://nominatim.openstreetmap.org/search.php?q="+q+"&format=jsonv2",
        success: function(response){
          if(response.length > 0){
            getMiniatureMap(response[0].lat,response[0].lon);
            $('#mapModalEnd').text(response[0].display_name);
          }
        },
        error:function(){
          showWarning("Erro no Servidor","Erro na aquisição dos dados de localização.");
        }
    });
}
const getMiniatureMap = function(lat,lon){
  var iconFeature = new ol.Feature({
    geometry: new ol.geom.Point([lon, lat]).transform('EPSG:4326', 'EPSG:900913'),
    name: $("#codigo").val()
  });
  iconFeature.setStyle(new ol.style.Style({
    image: new ol.style.Icon({
      anchor: [0.5, 46],
      anchorXUnits: 'fraction',
      anchorYUnits: 'pixels',
      src: 'img/package.png',
    }),
  }));
  map = new ol.Map({
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM()
      }),
      new ol.layer.Vector({
        source: new ol.source.Vector({
          features: [iconFeature]
        })
      })
    ],
    target: 'mapPlaceholder',
    view: new ol.View({
      center: ol.proj.fromLonLat([lon, lat]),
      zoom: 12
    })
  });
  map.addOverlay(popup);
  map.on('click', function (evt) {
    const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
      return feature;
    });
    if (feature) {
      popup.setPosition(evt.coordinate);
      $(popup.element).popover({
        placement: 'top',
        html: true,
        content: feature.get('name'),
      });
      $(popup.element).popover('show');
    } else {
      $(popup.element).popover('dispose');
    }
  });
}
const populateResult = function(res){
  var body = "";
  for(var i = 0;i < res.objeto.length;i++){
      var obj = res.objeto[i], events = "";
      if(!obj.categoria.includes("ERRO:")){
        for(var j = 0;j < obj.evento.length;j++){
          var event = obj.evento[j];
          events += populateStatus(event);
        }
        body += "<div class=\"card text-left mb-3\"><div class=\"card-header\">"+obj.categoria+" | "+obj.nome+"</div><div class=\"card-body\"><h5 class=\"card-title mb-4\">"+obj.numero+"</h5><div class=\"eventos\">"+events+"</div></div><div class=\"card-footer text-muted d-flex\"><span class=\"clock\"></span>Última atualização: "+obj.evento[0].data+" - "+obj.evento[0].hora+"</div></div>";
      }else{
        body += populateError(obj);
      }
  }
  $("#rastreios").html(body);
}
$(function(){
  $("body").on("click",".showMap",function(e){
    getLocation($(this).attr("data-end"));
  });
  $("#track-form").on("submit",function(e){
    e.preventDefault();
    $("#rastreios").fadeOut('50');
    var value = $("#codigo").val();
    if(value.length > 12){
      getData(value);
    }
  });
  $('#mapModal').on('hidden.bs.modal', function (e) {
    if(notNull(map)){
      map.disposeInternal();
    }
  })
  getVersion();
});

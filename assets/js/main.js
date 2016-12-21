var app = angular.module('climApp', ['ngCookies', 'chart.js']);
app.controller('MainController', ['$rootScope', '$http', 'WebService', '$filter', function( $rootScope, $http, WebService, $filter ){

  var vm = this;

  /**
   *
   * Inicia consumindo a API e mostrando as informações da data atual
   *
   */
  
  // Configurando a localização inicial
  vm.defaultLatitude = '-27.595378';
  vm.defaultLongitude = '-48.548050';
  vm.searchCity = 'Florianópolis';
  $rootScope.unitMetrics = 'ca';

  // Mostra as informações do dia atual
  getForecast( vm.defaultLatitude, vm.defaultLongitude, null, $rootScope.unitMetrics );

  // Mostra os próximos 6 dias
  getDays( vm.defaultLatitude, vm.defaultLongitude, null, $rootScope.unitMetrics );

  // Atualiza a unidade de temperatura
  vm.changeUnit = function( unit ) {
    $rootScope.unitMetrics = unit;

    getForecast( vm.defaultLatitude, vm.defaultLongitude, null, $rootScope.unitMetrics );
    getDays( vm.defaultLatitude, vm.defaultLongitude, null, $rootScope.unitMetrics );
  };

  // Atualiza informações ao selecionar outro dia
  vm.changeDay = function( time ) {
    getForecast( vm.defaultLatitude, vm.defaultLongitude, time, $rootScope.unitMetrics );
  }

  // Lista de cidades ao digitar na busca
  vm.autoComplete = function( value ){
    if ( vm.formSearch.$valid ){
      WebService.getCity( vm.searchCity, function( res ) {
        vm.listCities = res.data.RESULTS;
        vm.loaded = true;
      });
    }
  }

  // Seleciona uma nova cidade e recarrega os
  vm.selectCity = function( res ) {
    vm.searchCity = res.name;

    getForecast( res.lat, res.lon, null, $rootScope.unitMetrics );
    getDays( res.lat, res.lon, null, $rootScope.unitMetrics );
  }
  
  
  /**
   * Função que pega dados da previsão para o dia atual OU do dia selecionado
   * @params {string}   lat 
   * @params {string}   long
   * @params {date}     time
   */
    
  function getForecast( lat, long, time, unit ) {
    
    // Ativa classe para esconder o conteúdo até carregar os dados
    vm.loaded = false;
    
    return WebService.forecast( lat, long, time, unit, function( res ) {
      
      // Variavel para buscar informações atuais do tempo
      var currently = res.currently;
      
      // Formata a data atual
      vm.currentDay = $filter('date')( new Date(currently.time * 1000), 'EEEE');

      // Se for selecionado outro dia oculta o horário atual
      if ( !time ) {
        vm.currentTime = ' - ' + $filter('date')( new Date(currently.time * 1000), 'HH:mm');
      } else {
        vm.currentTime = '';
      }

      // Armazena a descrição da pevisão atual e icone
      vm.currentStatus = currently.summary;
      vm.currentIcon = 'wi-forecast-io-' + currently.icon;

      vm.currentTemp = parseInt( currently.temperature );

      // Armazena informação de umidade e velocidade do vendo
      vm.currentHumidity = parseInt( currently.humidity * 100 );
      vm.curentMind = parseInt( currently.windSpeed );

      // Desativa a classe para esconder o conteúdo depois de carregar
      vm.loaded = true;


      // Variavel para buscar informações por horário
      var hourly = res.hourly.data;

      // Cria um array para horários e temperaturas a serem inseridos no gráfico
      var hours = [];
      var temps = [];

      // Pega os próximos horários de 3 em 3 horas
      var count = 0;
      for ( var i = 0; i < 9; i++ ) {
        if ( i == 0 ) {
          count = i;
        } else {
          count += 3;
        }
        if ( hourly[count] ) {

          hours.push( $filter('date')( new Date( hourly[count]['time'] * 1000 ), 'HH:mm') );
          temps.push( parseInt( hourly[count]['temperature'] ) );

        } else { // Pega o ultimo horário do array
          
          hours.push( $filter('date')( new Date( hourly.slice(-1)[0]['time'] * 1000 ), 'HH:mm') );
          temps.push( parseInt( hourly.slice(-1)[0]['temperature'] ) );
        }
      }

      // Chama a função que monta o gráfico de temperaturas e horários
      vm.chart = setChart( hours, temps );

    });
  }

  /**
   * Função que busca da API a previsão dos próximos 6 dias
   * @params {string}  lat
   * @params {string}  long
   */
  
  function getDays( lat, long, time, unit ) {

    return WebService.forecast( lat, long, null, unit, function( res ) {
      
      var daily = res.daily.data;
      vm.dailyList = daily;

      // Formata a data nos dias atuais e grava a data original para a chamada de outro dia
      for ( var key in vm.dailyList ) {
        vm.dailyList[key]['original_time'] = vm.dailyList[key]['time'];
        vm.dailyList[key]['time'] = new Date(vm.dailyList[key]['time'] * 1000);
      }
    });
  }

  /**
   * Função que monta o gráfico de temperaturas
   * @params {array}  hours
   * @params {array}  temps
   */
  
  function setChart( hours, temps ) {
    var chart = {
      labels: hours,
      colors: ['#ffffff'],
      data: [
        temps
      ],
      datasetOverride: [{ yAxisID: 'y-axis-1' }],
      options: {
        scales: {
          yAxes: [
            {
              id: 'y-axis-1',
              type: 'linear',
              display: false,
              position: 'left',
              gridLines: {
                display: false
              },
              ticks: {
                display: false
              }
            }
          ],
          xAxes: [
            {
              gridLines: {
                display: false
              },
              ticks: {
                fontColor: "#FFF",
                fontFamily: 'montserrat',
                fontSize: 16
              }
            }
          ]
        },
        hover: false,
        legend: {
          display: false
        },
        tooltips: {
          enabled: true,
          mode: 'single',
          callbacks: {
            label: function(tooltipItem, data) {
              var label = data.labels[tooltipItem.index];
              var datasetLabel = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
              if ( $rootScope.unitMetrics == 'ca' ) {
                var unit = '°C';
              } else {
                var unit = '°F';
              }
              return datasetLabel + unit;
            }
          }
        },
        maintainAspectRatio: false,
        scaleShowVerticalLines: false,
      }
    }

    return chart;
  }
  
}]);
app.directive('selectOnClick', ['$window', function ($window) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      element.on('click', function () {
        if (!$window.getSelection().toString()) {
          this.setSelectionRange(0, this.value.length)
        }
      });
    }
  };
}]);
app.filter('int', function() {
  return function( input ) {
    return parseInt(input);
  };
});
app.filter('toTrusted', ['$sce', function( $sce ) {
  return function( text ) {
    return $sce.trustAsHtml( text) ;
  }
}]);
app.factory('WebService', ['$http', function( $http ){


  var apiKey = '5379a1fdb33c95b24ff31bec3f3f4f49';

  /**
   * Busca informações da API
   * @params {string}   lat   
   * @params {string}   long
   * @params {date}     time
   * @params {string}   unit
   * @params {function} callback
   * See https://darksky.net/dev/docs/forecast
   */
    
  function forecast( lat, long, time, unit, callback ) {
      
    if ( time == null ) {
      var url = 'https://api.darksky.net/forecast/' + apiKey + '/' + lat + ',' + long + '?lang=pt&units=' + unit;
    } else {
      var url = 'https://api.darksky.net/forecast/' + apiKey + '/' + lat + ',' + long + ',' + time + '?lang=pt&units=' + unit;
    }

    return  $http.get( url ).then( function success( res ) {
              callback( res.data );
            });
  }

  /**
   * Busca de cidades com autocomplete
   * @param {string}   input
   * @param {function} callback
   * See https://www.wunderground.com/weather/api/d/docs?d=autocomplete-api&MR=1
   */
  
  function getCity( input, callback ) {
    return  $http.get( 'http://autocomplete.wunderground.com/aq?query=' + input ).then( function success( res ) {
              callback( res );
            });
  };


  var service = {
    forecast: forecast,
    getCity: getCity
  }

  return service;

}]);
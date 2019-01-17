import _ from "lodash";

export class GenericDatasource {

  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.type = instanceSettings.type;
    this.url = `/api/datasources/proxy/${instanceSettings.id}/pagerduty/incidents`;
    this.name = instanceSettings.name;
    this.q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
  }

  testDatasource() {
    return this.doRequest({
      url: this.url,
      method: "GET",
    }).then(response => {
      if (response.status === 200) {
        return { 
            status: "success", 
            message: "Data source is working",
            title: "Success" 
        };
      }
    }).catch(response => {
      return { 
          status: "error", 
          message: `Data source is not working (code: ${response.status})`,
          title: "Error" 
      };
    });
  }

  transformResponse(response, options) {
    var result = [];
    for(var i = 0; i < response.data.incidents.length; i++){
        var d = response.data.incidents[i];
        if (options.annotation.serviceId && d.service.id != options.annotation.serviceId) {
            continue;
        }
        if (options.annotation.urgency && d.urgency != options.annotation.urgency) {
            continue;
        }
        if (options.annotation.status && d.status != options.annotation.status) {
            continue;
        }
        var created_at = Date.parse(d.created_at);

        var annotation_end = (d.status === 'resolved')? Date.parse(d.last_status_change_at) : Date.now();

        var incident = { annotation:
            { name: d.id,
              enabled: true,
              datasource: "grafana-pagerduty"
            },
            title: d.title,
            time: created_at,
            isRegion: true,
            timeEnd: annotation_end,
            tags: [ d.type, d.incident_key, d.incident_number, d.status, d.service.id ],
            text: '<a target="_blank" href="' + d.html_url + '">PagerDuty incident page</a>',
        };

        incident.tags = incident.tags.filter(function (el) {
            return el != null;
        });

        result.push(incident);
    }
    return result;
  }

  annotationQuery(options) {
    var queryString = "";

    queryString += "&since=" + new Date(options.range.from).toISOString();
    queryString += "&until=" + new Date(options.range.to).toISOString();

    return this.doRequest({
      url: `${this.url}?time_zone=UTC${queryString}`,
      method: 'GET'
    }).then(response => {
        var result = this.transformResponse(response, options);
        return result;
    }).catch(response => {
        return [];
    });
  }

  doRequest(options) {
    return this.backendSrv.datasourceRequest(options);
  }

}

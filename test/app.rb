require 'sinatra'
require 'rack/contrib'
require 'yajl/json_gem'

use Rack::PostBodyContentTypeParser
me = File.join(File.dirname(__FILE__))

post %r{api_jsonrpc.php$} do
  content_type :json
  js = request.env['rack.request.form_hash']

  case js['method']
  when 'host.get' then
    File.read me + '/samples/host_get-183.json'
  when 'trigger.get' then
    File.read me + '/samples/trigger_get-183.json'
  when 'maintenance.get' then
    File.read me + '/samples/maintenance_get-183.json'
  when 'user.authenticate' then 'xxx'.to_json
  end
end

get '/*' do
  File.read File.join(File.dirname(__FILE__), '..', params[:splat])
end

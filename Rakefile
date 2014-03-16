require 'webrick'

file 'public/allsets.json' do
  require 'net/http'
  require 'uri'
  uri = URI("http://mtgjson.com/json/AllSets.json")
  Net::HTTP.start(uri.host, uri.port) do |http|
    request = Net::HTTP::Get.new uri
    http.request(request) do |res|
      File.open("public/allsets.json", 'w') do |f|
        res.read_body do |segment|
          f.write segment
        end
      end
    end
  end
end

task :server => 'public/allsets.json' do
  s = WEBrick::HTTPServer.new Port: 3000, DocumentRoot: 'public'
  trap('INT') { s.shutdown }
  s.start
end

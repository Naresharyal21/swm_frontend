import React from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { Button } from '../components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4">
      <Card className="border-destructive/20">
        <CardContent className="py-12 text-center">
          <div className="text-sm font-mono font-bold text-destructive underline decoration-wavy underline-offset-4">
            ERROR 404
          </div>

          <div className="mt-4 text-3xl font-extrabold tracking-tight">
            Oops! यो पेज फेला परेन।
          </div>

          <div className="mt-4 mx-auto max-w-2xl text-base text-muted-foreground">
            <p className="font-medium text-foreground">
              “स्मार्ट प्रणालीमा फोहोरको त व्यवस्थापन हुन्छ, तर यो लिंकको हुन सकेन!”
            </p>
            <p className="mt-2 text-sm">
              तपाईंले खोज्नुभएको सामग्री सारिएको, मेटिएको वा उचित वर्गीकरण (Segregation) नभएको फोहोर जस्तै हराएको हुन सक्छ।
            </p>
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/app">
              <Button size="lg">Go to Dashboard</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">Go to Login</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="text-lg font-bold">खण्ड १: कानुनी व्यवस्था (नेपालको ऐन)</div>
          <div className="text-sm text-muted-foreground italic">📜 नागरिकको दायित्व र कानुनको जानकारी</div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed">
          <p>
            नेपालको <strong>ठोस फोहोर व्यवस्थापन ऐन, २०६८</strong> अनुसार फोहोरको उचित व्यवस्थापन गर्नु प्रत्येक नागरिकको कानुनी कर्तव्य हो।
          </p>

          <ul className="grid gap-3 pl-2">
            <li className="flex gap-3">
              <span className="text-primary font-bold">०१.</span>
              <span>
                <strong>स्रोतमै पृथकीकरण (धारा ६):</strong> फोहोर उत्पादन गर्ने व्यक्ति वा संस्थाले अनिवार्य रूपमा फोहोरलाई{' '}
                <strong>जैविक</strong> र <strong>अजैविक</strong> गरी छुट्याउनुपर्नेछ।
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">०२.</span>
              <span>
                <strong>जरिवानाको व्यवस्था:</strong> सार्वजनिक स्थानमा जथाभावी फोहोर फाल्नेलाई स्थानीय तहले कसुरको प्रकृति हेरी{' '}
                <strong>रु. ५०० देखि रु. ५०,०००</strong> सम्म जरिवाना गर्न सक्छ।
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-primary font-bold">०३.</span>
              <span>
                <strong>जोखिमपूर्ण फोहोर:</strong> स्वास्थ्य संस्था वा उद्योगबाट निस्कने हानिकारक फोहोरलाई सामान्य फोहोरसँग मिसाउन पाइँदैन; यसको
                व्यवस्थापन उत्पादक आफैले गर्नुपर्छ।
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="text-lg font-bold">खण्ड २: फोहोर वर्गीकरण गाइड</div>
          <div className="text-sm text-muted-foreground">♻️ सही बाल्टिनको प्रयोग गरौँ</div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-3 font-bold">बाल्टिनको रङ</th>
                  <th className="p-3 font-bold">प्रकार</th>
                  <th className="p-3 font-bold">उदाहरणहरू</th>
                  <th className="p-3 font-bold">के गर्ने?</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b transition-colors hover:bg-muted/30">
                  <td className="p-3 font-semibold text-green-600">हरियो (Green)</td>
                  <td className="p-3">जैविक (Organic)</td>
                  <td className="p-3">तरकारीको बोक्रा, बाँकी खाना, झारपात</td>
                  <td className="p-3">
                    <strong>कम्पोष्ट मल</strong> बनाउनुहोस्
                  </td>
                </tr>
                <tr className="border-b transition-colors hover:bg-muted/30">
                  <td className="p-3 font-semibold text-blue-600">निलो (Blue)</td>
                  <td className="p-3">पुनर्चक्रण (Recyclable)</td>
                  <td className="p-3">प्लास्टिक, कागज, सिसा, धातु</td>
                  <td className="p-3">
                    <strong>कबाडी</strong> वा रिसाइकल केन्द्रमा दिने
                  </td>
                </tr>
                <tr className="transition-colors hover:bg-muted/30">
                  <td className="p-3 font-semibold text-red-600">रातो (Red)</td>
                  <td className="p-3">जोखिमपूर्ण (Hazardous)</td>
                  <td className="p-3">ब्याट्री, सिरिन्ज, औषधि, मास्क</td>
                  <td className="p-3">
                    <strong>सुरक्षित संकलन</strong>का लागि छुट्याउने
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-green-200/50 bg-green-50/50 dark:bg-green-950/10">
          <CardHeader className="pb-2 font-bold text-green-700 dark:text-green-400">जैविक फोहोर: एक अवसर</CardHeader>
          <CardContent className="text-sm">
            नेपालका सहरमा निस्कने फोहोरमध्ये करिब <strong>६०% जैविक</strong> हुन्छ। यसलाई मोहर (मल) मा बदल्न सकिन्छ।
          </CardContent>
        </Card>

        <Card className="border-blue-200/50 bg-blue-50/50 dark:bg-blue-950/10">
          <CardHeader className="pb-2 font-bold text-blue-700 dark:text-blue-400">प्लास्टिक प्रदूषण</CardHeader>
          <CardContent className="text-sm">
            सुक्खा प्लास्टिक मात्र रिसाइकल गर्न सहज हुन्छ। खानाको अंश मिसिएको प्लास्टिकले अन्य पुनः प्रयोग हुने वस्तुलाई पनि फोहोर बनाउँछ।
          </CardContent>
        </Card>
      </div>

      <div className="border-t border-dashed py-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Smart Waste Management System</p>
        <p className="mt-1 text-xs text-muted-foreground">
          थोरै गरौँ (Reduce), पुनः प्रयोग गरौँ (Reuse), पुनर्चक्रण गरौँ (Recycle)
        </p>
      </div>
    </div>
  )
}

(function(root){
  'use strict';

  const AMAZON_TAG='spg_rpsgt-20';
  const SAFE_CONTEXTS=new Set(['rpsgt_v3_reference_center','cpsgt_reference','legacy_rpsgt_reference','lab_reference','shared']);
  const SAFE_CREDENTIALS=new Set(['rpsgt','cpsgt','ccsh','shared']);
  const records=Object.freeze({
    'fundamentals-sleep-technology-3e':Object.freeze({
      source_id:'fundamentals-sleep-technology-3e',
      canonical_title:'Fundamentals of Sleep Technology, Third Edition',
      author:'Mattice, Brooks, and Lee-Chiong (editors)',
      edition:'3rd',
      resource_type:'book',
      amazon_destination:'https://www.amazon.com/dp/1975111621?tag=spg_rpsgt-20',
      affiliate_program:'amazon',
      affiliate_tag:AMAZON_TAG,
      eligible_for_affiliate:true,
      disclosure_label:'We may earn a commission from qualifying purchases through this link.',
      notes:'Verified against the Guild storefront destination on 2026-09-10.',
      aliases:['Fundamentals of Sleep Technology']
    }),
    'polysomnography-sleep-technologist-2014':Object.freeze({
      source_id:'polysomnography-sleep-technologist-2014',
      canonical_title:'Polysomnography for the Sleep Technologist',
      author:'Robertson, Marshall, and Carno',
      edition:'1st',
      resource_type:'book',
      amazon_destination:'https://www.amazon.com/dp/0323100198?tag=spg_rpsgt-20',
      affiliate_program:'amazon',
      affiliate_tag:AMAZON_TAG,
      eligible_for_affiliate:true,
      disclosure_label:'We may earn a commission from qualifying purchases through this link.',
      notes:'Verified against the Guild storefront destination on 2026-09-10.',
      aliases:['Polysomnography for the Sleep Technologist: Instrumentation, Monitoring, and Related Procedures']
    }),
    'clinical-guide-pediatric-sleep-3e':Object.freeze({
      source_id:'clinical-guide-pediatric-sleep-3e',
      canonical_title:'A Clinical Guide to Pediatric Sleep, Third Edition',
      author:'Mindell and Owens',
      edition:'3rd',
      resource_type:'book',
      amazon_destination:'https://www.amazon.com/dp/1451193009?tag=spg_rpsgt-20',
      affiliate_program:'amazon',
      affiliate_tag:AMAZON_TAG,
      eligible_for_affiliate:true,
      disclosure_label:'We may earn a commission from qualifying purchases through this link.',
      notes:'Verified against the Guild storefront destination on 2026-09-10.',
      aliases:['A Clinical Guide to Pediatric Sleep']
    }),
    'sleep-medicine-pearls-3e':Object.freeze({
      source_id:'sleep-medicine-pearls-3e',
      canonical_title:'Sleep Medicine Pearls, Third Edition',
      author:'Berry and Wagner',
      edition:'3rd',
      resource_type:'book',
      amazon_destination:'https://www.amazon.com/dp/1455770515?tag=spg_rpsgt-20',
      affiliate_program:'amazon',
      affiliate_tag:AMAZON_TAG,
      eligible_for_affiliate:true,
      disclosure_label:'We may earn a commission from qualifying purchases through this link.',
      notes:'Verified against the Guild storefront destination on 2026-09-10.',
      aliases:['Sleep Medicine Pearls']
    }),
    'pediatric-sleep-pearls-1e':Object.freeze({
      source_id:'pediatric-sleep-pearls-1e',
      canonical_title:'Pediatric Sleep Pearls',
      author:'DelRosso, Berry, Beck, Wagner, and Marcus',
      edition:'1st',
      resource_type:'book',
      amazon_destination:'https://www.amazon.com/dp/0323392776?tag=spg_rpsgt-20',
      affiliate_program:'amazon',
      affiliate_tag:AMAZON_TAG,
      eligible_for_affiliate:true,
      disclosure_label:'We may earn a commission from qualifying purchases through this link.',
      notes:'Verified against the Guild storefront destination on 2026-09-10.',
      aliases:['Pediatric Sleep Pearls']
    }),
    'principles-practice-pediatric-sleep-2e':Object.freeze({
      source_id:'principles-practice-pediatric-sleep-2e',
      canonical_title:'Principles and Practice of Pediatric Sleep Medicine, Second Edition',
      author:'Sheldon, Ferber, Kryger, and Gozal (editors)',
      edition:'2nd',
      resource_type:'book',
      amazon_destination:'https://www.amazon.com/dp/1455703184?tag=spg_rpsgt-20',
      affiliate_program:'amazon',
      affiliate_tag:AMAZON_TAG,
      eligible_for_affiliate:true,
      disclosure_label:'We may earn a commission from qualifying purchases through this link.',
      notes:'Verified against the Guild storefront destination on 2026-09-10.',
      aliases:['Principles and Practice of Pediatric Sleep Medicine']
    })
  });

  const text=value=>String(value==null?'':value).trim();

  function get(sourceId){
    return records[text(sourceId)]||null;
  }

  function affiliateUrl(sourceId){
    const record=get(sourceId);
    if(!record||record.eligible_for_affiliate!==true||record.affiliate_program!=='amazon'||record.affiliate_tag!==AMAZON_TAG) return '';
    try{
      const url=new URL(record.amazon_destination);
      if(url.protocol!=='https:'||!/(^|\.)amazon\.com$/i.test(url.hostname)||url.searchParams.get('tag')!==AMAZON_TAG) return '';
      return url.toString();
    }catch(_error){
      return '';
    }
  }

  function trackAffiliateClick(options){
    const input=options||{};
    const sourceId=text(input.sourceId);
    const record=get(sourceId);
    if(!record||!affiliateUrl(sourceId)||typeof root.gtag!=='function') return false;
    const resourceContext=SAFE_CONTEXTS.has(text(input.resourceContext))?text(input.resourceContext):'shared';
    const credentialArea=SAFE_CREDENTIALS.has(text(input.credentialArea))?text(input.credentialArea):'shared';
    root.gtag('event','affiliate_click',{
      affiliate_program:'amazon',
      link_kind:'book',
      source_id:record.source_id,
      resource_context:resourceContext,
      credential_area:credentialArea
    });
    return true;
  }

  root.SPGResourceCommerceRegistry=Object.freeze({
    affiliateTag:AMAZON_TAG,
    get,
    affiliateUrl,
    trackAffiliateClick
  });
})(typeof window!=='undefined'?window:globalThis);
